#!/usr/bin/env bash

BASE_URL="${1:-http://localhost:4004}"
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
curl -s "$ENDPOINT/WorkflowInstances" | jq -r '.value[].ID' | while read -r id; do
  curl -s -X DELETE "$ENDPOINT/WorkflowInstances/$id"
  echo "deleted instance $id"
done

echo "=== Done ==="
