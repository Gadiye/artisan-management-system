#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}         Database Seeding Helper Script       ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check for unified root .env or local .env file and source it
if [ -f ../.env ]; then
    echo -e "${GREEN}Found unified root .env file. Loading environment variables...${NC}"
    export $(grep -v '^#' ../.env | xargs)
elif [ -f .env ]; then
    echo -e "${GREEN}Found local .env file. Loading environment variables...${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${YELLOW}No .env file found. Will use system environment variables.${NC}"
fi

# Print current configuration status
echo -e "\n${BLUE}Current Environment Status:${NC}"
if [ -n "$DATABASE_URL" ]; then
    # Mask password in URL for display
    MASKED_PROD=$(echo "$DATABASE_URL" | sed -E 's/(:\/\/.*:)[^@]*(@)/1****\2/')
    echo -e "  Production DB (DATABASE_URL): ${GREEN}Configured${NC} ($MASKED_PROD)"
else
    echo -e "  Production DB (DATABASE_URL): ${RED}Not Configured${NC}"
fi

if [ -n "$DEMO_DATABASE_URL" ]; then
    MASKED_DEMO=$(echo "$DEMO_DATABASE_URL" | sed -E 's/(:\/\/.*:)[^@]*(@)/1****\2/')
    echo -e "  Demo DB (DEMO_DATABASE_URL):  ${GREEN}Configured${NC} ($MASKED_DEMO)"
else
    echo -e "  Demo DB (DEMO_DATABASE_URL):  ${YELLOW}Not Configured${NC} (Will check system environment or prompt if needed)"
fi

echo -e "\n${YELLOW}Which database would you like to seed?${NC}"
echo "1) Demo Database"
echo "2) Production / Development Database"
read -p "Enter choice (1 or 2): " CHOICE

if [ "$CHOICE" == "1" ]; then
    # Seeding Demo DB
    export DEMO_MODE=True
    
    # Check if DEMO_DATABASE_URL is set
    if [ -z "$DEMO_DATABASE_URL" ]; then
        echo -e "\n${YELLOW}DEMO_DATABASE_URL is not set. Please enter the connection string:${NC}"
        read -p "URL: " DEMO_DATABASE_URL
        if [ -z "$DEMO_DATABASE_URL" ]; then
            echo -e "${RED}Error: DEMO_DATABASE_URL cannot be empty.${NC}"
            exit 1
        fi
        export DEMO_DATABASE_URL
    fi
    
    MASKED_TARGET=$(echo "$DEMO_DATABASE_URL" | sed -E 's/(:\/\/.*:)[^@]*(@)/1****\2/')
    echo -e "\n${GREEN}🚀 Starting Demo Database Seeding...${NC}"
    echo -e "Target: ${BLUE}$MASKED_TARGET${NC}"
    
elif [ "$CHOICE" == "2" ]; then
    # Seeding Production/Dev DB
    export DEMO_MODE=False
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}Error: DATABASE_URL is not configured.${NC}"
        exit 1
    fi
    
    MASKED_TARGET=$(echo "$DATABASE_URL" | sed -E 's/(:\/\/.*:)[^@]*(@)/1****\2/')
    
    echo -e "\n${RED}⚠️  WARNING: You are about to seed the PRODUCTION/DEVELOPMENT database!${NC}"
    echo -e "Target: ${BLUE}$MASKED_TARGET${NC}"
    echo -e "This will write mock historical data into this database."
    read -p "Are you absolutely sure you want to proceed? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "YES" ]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        exit 0
    fi
    
    echo -e "\n${GREEN}🚀 Starting Production/Dev Database Seeding...${NC}"
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi

# Activate virtual environment if it exists and isn't active
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -d "venv" ]; then
        echo -e "${GREEN}Activating virtual environment (venv)...${NC}"
        source venv/bin/activate
    elif [ -d "../venv" ]; then
        echo -e "${GREEN}Activating virtual environment (../venv)...${NC}"
        source ../venv/bin/activate
    else
        echo -e "${YELLOW}Warning: No virtual environment found. Running with global python...${NC}"
    fi
fi

# Run migrations first
echo -e "\n${BLUE}Running migrations...${NC}"
python manage.py migrate
if [ $? -ne 0 ]; then
    echo -e "${RED}Migrations failed. Seeding aborted.${NC}"
    exit 1
fi

# Run the seeding management command
echo -e "\n${BLUE}Running seed_demo_data...${NC}"
python manage.py seed_demo_data
if [ $? -ne 0 ]; then
    echo -e "${RED}Seeding failed.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Database successfully configured and seeded!${NC}"
