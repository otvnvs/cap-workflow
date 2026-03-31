#!/usr/bin/env bash

BASE_URL="${1:-http://localhost:4008}"
WORKFLOW="$BASE_URL/workflow"
WORKFLOW_AGG="$BASE_URL/workflow-agg"
ENTITY_NAME="fs.workflow.Workflow1"

pause() { read -rp "--- $1 [enter] "; }

pause "1. Create Workflow1 entity"
RESPONSE=$(curl -s -X POST "$WORKFLOW/Workflow1" \
  -H "Content-Type: application/json" \
  -d "$(jq -n '{}')")
echo "$RESPONSE"
echo "$RESPONSE" | jq .
ID=$(echo "$RESPONSE" | jq -r '.ID')
echo "ID: $ID"
KEY_JSON=$(jq -n --arg id "$ID" '{"ID": $id}' | jq -c .)

pause "2. Start workflow"
curl -s -X POST "$WORKFLOW_AGG/start" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg en "$ENTITY_NAME" --arg kj "$KEY_JSON" --arg by "alice" \
    '{entityName: $en, keyJson: $kj, initiatedBy: $by}')" | jq .

pause "3. Assign owner"
curl -s -X POST "$WORKFLOW_AGG/assignOwner" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg en "$ENTITY_NAME" --arg kj "$KEY_JSON" --arg owner "bob" \
    '{entityName: $en, keyJson: $kj, ownerId: $owner}')" | jq .

pause "4. Set due date"
curl -s -X POST "$WORKFLOW_AGG/setDueDate" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg en "$ENTITY_NAME" --arg kj "$KEY_JSON" --arg due "2026-12-31T00:00:00Z" \
    '{entityName: $en, keyJson: $kj, dueDate: $due}')" | jq .

pause "5. Transition to BLOCKED"
curl -s -X POST "$WORKFLOW_AGG/transition" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg en "$ENTITY_NAME" --arg kj "$KEY_JSON" --arg st "BLOCKED" --arg sub "Awaiting approval" \
    '{entityName: $en, keyJson: $kj, status: $st, substatus: $sub}')" | jq .

pause "6. Transition to COMPLETED"
curl -s -X POST "$WORKFLOW_AGG/transition" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg en "$ENTITY_NAME" --arg kj "$KEY_JSON" --arg st "COMPLETED" \
    '{entityName: $en, keyJson: $kj, status: $st}')" | jq .

pause "7. Read workflow projection"
curl -s "$WORKFLOW_AGG/Workflow1('$ID')" | jq .

pause "8. WorkflowCatalog"
curl -s "$WORKFLOW_AGG/WorkflowCatalog" | jq .

pause "9. Delete Workflow1 entity"
curl -s -X DELETE "$WORKFLOW_AGG/Workflow1('$ID')" 
echo "deleted $ID"
