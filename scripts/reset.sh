#!/usr/bin/env bash

BASE_URL="${1:-http://localhost:4005}"
ENDPOINT="$BASE_URL/workflow"

echo "=== Delete WorkflowTasks ==="
curl -s "$ENDPOINT/WorkflowTasks" | jq -r '.value[].ID' | while read -r id; do
  curl -s -X DELETE "$ENDPOINT/WorkflowTasks/$id"
  echo "deleted task $id"
done

echo "=== Delete WorkflowHistory ==="
curl -s "$ENDPOINT/WorkflowHistory" | jq -r '.value[].ID' | while read -r id; do
  curl -s -X DELETE "$ENDPOINT/WorkflowHistory/$id"
  echo "deleted history $id"
done

echo "=== Delete WorkflowInstances ==="
for ENTITY in Test Workflow1 Workflow2 Workflow3 Workflow5 Workflow6 Workflow7; do
curl -s "$ENDPOINT/$ENTITY" | jq -r '.value[].ID' | while read -r id; do
  curl -s -X DELETE "$ENDPOINT/$ENTITY/$id"
  echo "deleted instance $id"
done

done

echo "=== Done ==="
