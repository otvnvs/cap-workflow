#!/bin/bash
BASE_URL="http://localhost:4004"

# 1. Fetch and build the list once at the start
echo "Loading OData entities..."
SERVICES=$(curl -s "$BASE_URL/" | htmlq a -a href | grep '$metadata')
URL_LIST=""

for SERVICE_PATH in $SERVICES; do
    METADATA_URL="${BASE_URL}${SERVICE_PATH}"
    SERVICE_BASE=$(echo "$SERVICE_PATH" | sed 's/\/\$metadata//')
    # Use -a Name (capitalized) as OData XML usually uses Name
    ENTITIES=$(curl -s "$METADATA_URL" | htmlq EntityType -a name)
    for ENTITY in $ENTITIES; do
        ENTITY_URL="${BASE_URL}${SERVICE_BASE}/${ENTITY}"
        # Build the list with a literal newline
        URL_LIST="${URL_LIST}${ENTITY_URL}\n"
    done
done

# 2. Start the selection loop
while true; do
    # Use -e to interpret the \n in the variable
    SELECTED_URL=$(echo -e "$URL_LIST" | fzf --height 40% --reverse --header "Select an OData Entity (ESC to quit):")

    # If the user hits ESC or Ctrl+C, exit the loop
    if [ -z "$SELECTED_URL" ]; then
        echo "Exiting..."
        break
    fi
if [ -n "$SELECTED_URL" ]; then
    TOP=10
    SKIP=0
    
    while true; do
        clear
        echo -e "--- Entity: $SELECTED_URL (Page: $((SKIP/TOP + 1))) ---"
        echo -e "Controls: [l] Next Page  [h] Prev Page  [q] Back to Menu\n"

        # Fetch and Format Table
        DATA=$(curl -s "$SELECTED_URL?\$top=$TOP&\$skip=$SKIP")
        
        # Use our previous jq logic to render the table
        echo "$DATA" | jq -r '
          .value | if length > 0 then 
            (.[0] | keys_unsorted) as $keys | 
            $keys, (.[] | [.[$keys[]]]) 
          else "--- No more data ---" end | @tsv' | column -t -s $'\t'

        # Read a single key press (Vim style)
        read -n 1 -s -r KEY
        case "$KEY" in
            l) # Next Page
                SKIP=$((SKIP + TOP))
                ;;
            j) # Prev Page
                if [ $SKIP -ge $TOP ]; then
                    SKIP=$((SKIP - TOP))
                fi
                ;;
            q) # Quit back to fzf menu
                break
                ;;
        esac
    done
    clear
fi
    
    clear
done

