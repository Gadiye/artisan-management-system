#!/bin/bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ALWAYS resolve the script's directory and run from there
# This allows high-level users to run the script from any directory on the system
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Parse CLI arguments for custom environment file
ENV_FILE=".env"
if [ -n "$1" ]; then
    if [ -f "$1" ]; then
        ENV_FILE="$1"
    else
        # If relative path didn't match, check in script directory
        if [ -f "$SCRIPT_DIR/$1" ]; then
            ENV_FILE="$SCRIPT_DIR/$1"
        else
            echo -e "${RED}Error: Custom env file '$1' not found! Falling back to default .env.${NC}"
            sleep 1.5
        fi
    fi
fi

# Detect Compose Command
if command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

get_env_val() {
    local key=$1
    if [ -f "$ENV_FILE" ]; then
        grep -v '^#' "$ENV_FILE" | grep "^${key}=" | cut -d'=' -f2- | xargs
    fi
}

mask_url() {
    local url=$1
    if [ -n "$url" ]; then
        echo "$url" | sed -E 's/(:\/\/.*:)[^@]*(@)/1****\2/'
    else
        echo "Not Configured"
    fi
}

draw_header() {
    clear
    echo -e "${CYAN}┌──────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${BOLD}                DEVELOPER ENVIRONMENT MANAGER                 ${NC}${CYAN}│${NC}"
    echo -e "${CYAN}└──────────────────────────────────────────────────────────────┘${NC}"
}

draw_status() {
    # Read values
    local demo_mode=$(get_env_val "DEMO_MODE")
    local db_url=$(get_env_val "DATABASE_URL")
    local demo_db_url=$(get_env_val "DEMO_DATABASE_URL")
    
    echo -e "${BOLD}Current Configuration Status:${NC} (File: ${CYAN}$ENV_FILE${NC})"
    
    # 1. Environment Mode
    if [[ "$demo_mode" =~ ^[Tt]rue$ ]]; then
        echo -e "  Mode:           ${YELLOW}● DEMO SANDBOX MODE${NC}"
        echo -e "  Active DB:      ${CYAN}$(mask_url "$demo_db_url")${NC}"
    else
        echo -e "  Mode:           ${RED}● PRODUCTION / DEVELOPMENT MODE${NC}"
        echo -e "  Active DB:      ${CYAN}$(mask_url "$db_url")${NC}"
    fi
    
    # 2. Containers Status
    echo -ne "  Containers:     "
    if $COMPOSE_CMD ps &>/dev/null; then
        local running_cnt=$($COMPOSE_CMD ps 2>/dev/null | grep -iE 'up|running' | wc -l)
        if [ "$running_cnt" -gt 0 ]; then
            echo -e "${GREEN}● Running ($running_cnt services active)${NC}"
        else
            echo -e "${YELLOW}○ Stopped${NC}"
        fi
    else
        echo -e "${RED}○ Offline (Compose not initialized)${NC}"
    fi
    echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
}

toggle_mode() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Error: Environment file '$ENV_FILE' not found!${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    local demo_mode=$(get_env_val "DEMO_MODE")
    if [[ "$demo_mode" =~ ^[Tt]rue$ ]]; then
        sed -i -E 's/DEMO_MODE=[Tt]rue/DEMO_MODE=False/g' "$ENV_FILE"
        echo -e "\n${RED}Switching to: PRODUCTION/DEVELOPMENT Mode${NC}"
    else
        sed -i -E 's/DEMO_MODE=[Ff]alse/DEMO_MODE=True/g' "$ENV_FILE"
        echo -e "\n${YELLOW}Switching to: DEMO SANDBOX Mode${NC}"
    fi
    
    echo -e "${GREEN}Updated environment configuration successfully.${NC}"
    
    # Ask if they want to restart containers
    read -p "Would you like to restart the containers now to apply changes? (y/n): " restart_choice
    if [[ "$restart_choice" =~ ^[Yy]$ ]]; then
        restart_containers
    fi
}

restart_containers() {
    echo -e "\n${BLUE}🔄 Restarting containers with ${COMPOSE_CMD}...${NC}"
    $COMPOSE_CMD down
    $COMPOSE_CMD up -d
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Containers restarted successfully in the background!${NC}"
    else
        echo -e "${RED}❌ Failed to restart containers.${NC}"
    fi
    read -p "Press Enter to continue..."
}

activate_venv() {
    if [ -z "$VIRTUAL_ENV" ]; then
        if [ -d "appback/venv" ]; then
            echo -e "${GREEN}Activating virtual environment (appback/venv)...${NC}"
            source appback/venv/bin/activate
        elif [ -d "venv" ]; then
            echo -e "${GREEN}Activating virtual environment (venv)...${NC}"
            source venv/bin/activate
        else
            echo -e "${YELLOW}Warning: No virtual environment found. Running with global python...${NC}"
        fi
    fi
}

seed_active_db() {
    echo -e "\n${BLUE}🌱 Initializing Database Seeding...${NC}"
    if [ -f appback/seed.sh ]; then
        cd appback
        ./seed.sh
        cd ..
    else
        echo -e "${RED}Error: Seeding script not found at appback/seed.sh!${NC}"
    fi
    read -p "Press Enter to continue..."
}

delete_db_data() {
    local demo_mode=$(get_env_val "DEMO_MODE")
    local db_url=""
    
    if [[ "$demo_mode" =~ ^[Tt]rue$ ]]; then
        db_url=$(get_env_val "DEMO_DATABASE_URL")
        echo -e "\n${RED}⚠️  WARNING: You are about to DELETE all data from the DEMO database!${NC}"
    else
        db_url=$(get_env_val "DATABASE_URL")
        echo -e "\n${RED}⚠️  WARNING: You are about to DELETE all data from the PRODUCTION/DEVELOPMENT database!${NC}"
    fi
    
    local masked_url=$(mask_url "$db_url")
    echo -e "Target DB:  ${BLUE}$masked_url${NC}"
    echo -e "This is a ${BOLD}${RED}destructive action${NC} that will clear all tables (retaining the schema structure)."
    read -p "Are you absolutely sure you want to proceed? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ] && [ "$confirm" != "YES" ]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    activate_venv
    
    cd appback
    echo -e "\n${BLUE}Ensuring database tables are fully migrated...${NC}"
    python manage.py migrate
    
    echo -e "\n${BLUE}Clearing database data (django flush)...${NC}"
    python manage.py flush --no-input
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Active Database cleared successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to clear database data.${NC}"
        echo -e "${YELLOW}Tip: If this is a completely blank database, you don't need to clear it; you can directly run Seeding (Option 3) or Restore (Option 5).${NC}"
    fi
    cd ..
    
    read -p "Press Enter to continue..."
}

restore_db_backup() {
    local demo_mode=$(get_env_val "DEMO_MODE")
    local db_url=""
    
    if [[ "$demo_mode" =~ ^[Tt]rue$ ]]; then
        db_url=$(get_env_val "DEMO_DATABASE_URL")
        echo -e "\n${RED}⚠️  WARNING: You are about to OVERWRITE the DEMO database!${NC}"
    else
        db_url=$(get_env_val "DATABASE_URL")
        echo -e "\n${RED}⚠️  WARNING: You are about to OVERWRITE the PRODUCTION/DEVELOPMENT database!${NC}"
    fi
    
    if [ ! -f backup.dump ]; then
        echo -e "${RED}Error: backup.dump file not found in the root directory!${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    local masked_url=$(mask_url "$db_url")
    echo -e "Target DB:  ${BLUE}$masked_url${NC}"
    echo -e "Source:     ${CYAN}backup.dump${NC}"
    echo -e "This will drop and recreate all tables and populate them with backup data."
    echo -e "${YELLOW}Pro-Tip: If you get locking errors, STOP your containers first using Option [2].${NC}"
    read -p "Are you absolutely sure you want to restore this database? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ] && [ "$confirm" != "YES" ]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    echo -e "\n${BLUE}Restoring database from backup.dump...${NC}"
    
    # 1. Dynamically parse the dump file version format
    local pg_image="docker.io/library/postgres:latest"
    if [ -f backup.dump ] && command -v file &>/dev/null; then
        local format_ver=$(file backup.dump 2>/dev/null | grep -o -E 'v[0-9]+\.[0-9]+' | cut -d'v' -f2)
        if [ -n "$format_ver" ]; then
            echo -e "Dump file format version detected: ${CYAN}v$format_ver${NC}"
            local major=$(echo "$format_ver" | cut -d'.' -f1)
            local minor=$(echo "$format_ver" | cut -d'.' -f2)
            if [ "$major" -eq 1 ]; then
                if [ "$minor" -eq 14 ]; then
                    pg_image="docker.io/library/postgres:15"
                elif [ "$minor" -eq 15 ]; then
                    pg_image="docker.io/library/postgres:16"
                elif [ "$minor" -eq 16 ]; then
                    pg_image="docker.io/library/postgres:17"
                elif [ "$minor" -eq 17 ]; then
                    pg_image="docker.io/library/postgres:18"
                elif [ "$minor" -eq 18 ]; then
                    pg_image="docker.io/library/postgres:19"
                else
                    pg_image="docker.io/library/postgres:latest"
                fi
            fi
        fi
    fi

    local restore_success=1
    local CONTAINER_ENGINE=""
    if command -v podman &> /dev/null; then
        CONTAINER_ENGINE="podman"
    elif command -v docker &> /dev/null; then
        CONTAINER_ENGINE="docker"
    fi

    # 2. Run containerized restore with auto-pull self-healing
    if [ -n "$CONTAINER_ENGINE" ]; then
        echo -e "\n${BLUE}🧹 Preparing database: Dropping and recreating 'public' schema to prevent foreign key constraint issues...${NC}"
        $CONTAINER_ENGINE run --rm --net=host "$pg_image" psql -d "$db_url" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        
        echo -e "\n${GREEN}Using containerized pg_restore via $CONTAINER_ENGINE ($pg_image)...${NC}"
        $CONTAINER_ENGINE run --rm --net=host -v "$SCRIPT_DIR:/workspace" -w /workspace "$pg_image" pg_restore --clean --no-owner --no-privileges -d "$db_url" backup.dump
        restore_success=$?
        
        # Self-healing pull trigger
        if [ $restore_success -ne 0 ]; then
            echo -e "\n${YELLOW}⚠️  Restore failed. Your local image cache ($pg_image) might be outdated or missing newer formats.${NC}"
            read -p "Would you like to sync/pull latest updates for '$pg_image' and retry? (y/n): " pull_choice
            if [[ "$pull_choice" =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}🔄 Syncing/Pulling latest $pg_image...${NC}"
                $CONTAINER_ENGINE pull "$pg_image"
                
                echo -e "\n${BLUE}🧹 Re-preparing database schema...${NC}"
                $CONTAINER_ENGINE run --rm --net=host "$pg_image" psql -d "$db_url" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
                
                echo -e "\n${GREEN}Retrying restore...${NC}"
                $CONTAINER_ENGINE run --rm --net=host -v "$SCRIPT_DIR:/workspace" -w /workspace "$pg_image" pg_restore --clean --no-owner --no-privileges -d "$db_url" backup.dump
                restore_success=$?
            fi
        fi
    else
        # Fallback to local host pg_restore
        echo -e "${YELLOW}No container engine found. Dropping and recreating public schema locally...${NC}"
        psql -d "$db_url" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        
        echo -e "${YELLOW}Falling back to host pg_restore...${NC}"
        pg_restore --clean --no-owner --no-privileges -d "$db_url" backup.dump
        restore_success=$?
    fi
    
    if [ $restore_success -le 1 ]; then
        echo -e "${GREEN}✅ Database successfully restored from backup.dump!${NC}"
    else
        echo -e "${RED}❌ Failed to restore database.${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

view_logs() {
    echo -e "\n${BLUE}📋 Showing container logs (Press Ctrl+C to exit)...${NC}"
    $COMPOSE_CMD logs -f --tail=50
}

install_globally() {
    local target_dir="$HOME/.local/bin"
    mkdir -p "$target_dir"
    local link_name="$target_dir/artisan-manager"
    
    # Create an absolute path symlink pointing to this script
    ln -sf "$SCRIPT_DIR/switch.sh" "$link_name"
    
    if [ -f "$link_name" ]; then
        echo -e "\n${GREEN}✅ Successfully installed globally as 'artisan-manager'!${NC}"
        echo -e "You can now run ${BOLD}artisan-manager${NC} from any directory in your terminal."
        echo -e "${YELLOW}Make sure '$target_dir' is in your PATH. (To add it, append: export PATH=\$PATH:$target_dir to ~/.bashrc)${NC}"
    else
        echo -e "${RED}❌ Failed to install globally.${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Main Loop
while true; do
    draw_header
    draw_status
    
    echo -e "${BOLD}Available Actions:${NC}"
    echo -e "  ${CYAN}[1]${NC} Toggle Environment Mode (DEMO ↔ PROD)"
    echo -e "  ${CYAN}[2]${NC} Restart/Stop Containers"
    echo -e "  ${CYAN}[3]${NC} Run Database Seeding"
    echo -e "  ${CYAN}[4]${NC} Clear/Flush Active Database (Destructive)"
    echo -e "  ${CYAN}[5]${NC} Restore Active Database from Backup (backup.dump)"
    echo -e "  ${CYAN}[6]${NC} View Container Logs"
    echo -e "  ${CYAN}[7]${NC} Install manager CLI globally ('artisan-manager')"
    echo -e "  ${CYAN}[8]${NC} Exit Manager"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────${NC}"
    
    read -p "Choose an action [1-8]: " action
    
    case $action in
        1) toggle_mode ;;
        2) restart_containers ;;
        3) seed_active_db ;;
        4) delete_db_data ;;
        5) restore_db_backup ;;
        6) view_logs ;;
        7) install_globally ;;
        8) 
            echo -e "\n${GREEN}Goodbye!${NC}"
            exit 0 
            ;;
        *)
            echo -e "${RED}Invalid option.${NC}"
            sleep 1
            ;;
    esac
done
