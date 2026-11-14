#!/usr/bin/env bash
# Run in Google Cloud Shell using the project that owns pmj-ga4-reader.
set -euo pipefail

command -v gcloud >/dev/null || { echo 'Google Cloud SDK is required (Cloud Shell includes it).' >&2; exit 1; }
project_id="${1:-$(gcloud config get-value project 2>/dev/null)}"
if [[ -z "$project_id" || "$project_id" == '(unset)' ]]; then
  echo 'Select the project containing pmj-ga4-reader, or pass its project ID as the first argument.' >&2
  exit 1
fi

repo='Mylesemi/pmj.log'
repo_id='1430624700'
owner_id='94043537'
pool_id='github-pmj'
provider_id='github'
service_account="pmj-ga4-reader@${project_id}.iam.gserviceaccount.com"

# Never create a replacement service account in the wrong project.
gcloud iam service-accounts describe "$service_account" --project="$project_id" --format='value(email)' >/dev/null
project_number="$(gcloud projects describe "$project_id" --format='value(projectNumber)')"
[[ "$project_number" =~ ^[0-9]+$ ]] || { echo 'Could not resolve the project number.' >&2; exit 1; }
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com analyticsdata.googleapis.com --project="$project_id"

pool_name="$(gcloud iam workload-identity-pools list --location=global --project="$project_id" --filter="name=projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}" --format='value(name)')"
if [[ -z "$pool_name" ]]; then
  gcloud iam workload-identity-pools create "$pool_id" --location=global --project="$project_id" --display-name='pmj.log GitHub Actions'
fi

mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref'
condition="assertion.repository_id == '${repo_id}' && assertion.repository_owner_id == '${owner_id}' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${repo}/.github/workflows/ga4-analytics.yml@refs/heads/main'"
provider_name="$(gcloud iam workload-identity-pools providers list --workload-identity-pool="$pool_id" --location=global --project="$project_id" --filter="name=projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/providers/${provider_id}" --format='value(name)')"
if [[ -z "$provider_name" ]]; then
  gcloud iam workload-identity-pools providers create-oidc "$provider_id" \
    --workload-identity-pool="$pool_id" --location=global --project="$project_id" \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$mapping" --attribute-condition="$condition"
else
  gcloud iam workload-identity-pools providers update-oidc "$provider_id" \
    --workload-identity-pool="$pool_id" --location=global --project="$project_id" \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$mapping" --attribute-condition="$condition"
fi

gcloud iam service-accounts add-iam-policy-binding "$service_account" --project="$project_id" \
  --role='roles/iam.workloadIdentityUser' \
  --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/attribute.repository_id/${repo_id}" \
  --condition=None >/dev/null

provider="projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/providers/${provider_id}"
printf '\nGCP_WIF_PROVIDER=%s\nGCP_SERVICE_ACCOUNT=%s\nGA4_PROPERTY_ID=564297056\n\n' "$provider" "$service_account"

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh variable set GCP_WIF_PROVIDER --repo "$repo" --body "$provider"
  gh variable set GCP_SERVICE_ACCOUNT --repo "$repo" --body "$service_account"
  gh variable set GA4_PROPERTY_ID --repo "$repo" --body '564297056'
  gh workflow run ga4-analytics.yml --repo "$repo" --ref main
  echo 'GitHub Variables saved and GA4 statistics workflow dispatched.'
else
  echo 'Cloud setup complete. Add the three values above as GitHub repository Variables:'
  echo 'https://github.com/Mylesemi/pmj.log/settings/variables/actions'
  echo 'Then run Update GA4 visitor statistics from Actions.'
  echo 'If GitHub CLI is available, sign in with gh auth login and rerun this script to finish automatically.'
fi
