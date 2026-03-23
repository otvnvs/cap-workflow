#!/bin/bash
HOST=http://localhost:4005
URL=$HOST/workflow
NROWS=20
for ROWIDX in $(seq 1 1 $NROWS);do
	for ENTITY in Test Workflow1 Workflow2 Workflow3 Workflow4 Workflow5 Workflow6 Workflow7; do
		curl -X POST -H "Content-Type: application/json" "$URL/$ENTITY" --data '{}'
	done
done

