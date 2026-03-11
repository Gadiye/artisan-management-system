import json
import os
import re

# File Paths
SERVICES_JSON = 'services.json'
BACKEND_PRODUCT_MODEL = 'appback/products/models.py'
BACKEND_JOB_MODEL = 'appback/jobs/models.py'
BACKEND_INVENTORY_MODEL = 'appback/inventory/models.py'
FRONTEND_CONSTANTS = 'my-app/lib/constants.ts'

def load_services():
    with open(SERVICES_JSON, 'r') as f:
        return json.load(f)['services']

def update_backend_models(services):
    choices = [(s['id'], s['label']) for s in services]
    choices_str = "    SERVICE_CATEGORIES = [\n"
    for cid, label in choices:
        choices_str += f"        ('{cid}', '{label}'),\n"
    choices_str += "    ]"

    # Update Products Model
    with open(BACKEND_PRODUCT_MODEL, 'r') as f:
        content = f.read()
    
    pattern = r"    SERVICE_CATEGORIES = \[[^\]]*\]"
    new_content = re.sub(pattern, choices_str, content, flags=re.DOTALL)
    
    with open(BACKEND_PRODUCT_MODEL, 'w') as f:
        f.write(new_content)
    print(f"Updated {BACKEND_PRODUCT_MODEL}")

    # Update Jobs Model (ServiceRate choices)
    with open(BACKEND_JOB_MODEL, 'r') as f:
        content = f.read()
    
    pattern = r"    SERVICE_CATEGORY_CHOICES = \[[^\]]*\]"
    # Using a slightly different variable name for Job model if needed
    job_choices_str = choices_str.replace("SERVICE_CATEGORIES", "SERVICE_CATEGORY_CHOICES")
    new_content = re.sub(pattern, job_choices_str, content, flags=re.DOTALL)
    
    with open(BACKEND_JOB_MODEL, 'w') as f:
        f.write(new_content)
    print(f"Updated {BACKEND_JOB_MODEL}")

    # Update Inventory Model (Inventory choices)
    with open(BACKEND_INVENTORY_MODEL, 'r') as f:
        content = f.read()
    
    pattern = r"        choices=\[[^\]]*\]"
    inventory_choices_str = "        choices=[\n"
    for cid, label in choices:
        inventory_choices_str += f"            ('{cid}', '{label}'),\n"
    inventory_choices_str += "        ]"
    new_content = re.sub(pattern, inventory_choices_str, content, flags=re.DOTALL)
    
    with open(BACKEND_INVENTORY_MODEL, 'w') as f:
        f.write(new_content)
    print(f"Updated {BACKEND_INVENTORY_MODEL}")

def update_frontend_constants(services):
    # Prepare data
    service_categories = [s['id'] for s in services if s['id'] != 'DRAWING']
    service_stages = [s['id'] for s in services if s['id'] != 'FINISHING']
    production_stages = [{"key": s['id'], "label": s['label']} for s in services if s['id'] != 'FINISHED']
    chain_map = {s['id']: s['depends_on'] for s in services if s['depends_on']}
    colors = {s['id']: s['color'] for s in services}

    # Generate strings
    categories_str = f"export const SERVICE_CATEGORIES = {json.dumps(service_categories)} as const;"
    stages_str = f"export const SERVICE_STAGES = {json.dumps(service_stages)} as const;"
    prod_stages_str = f"export const PRODUCTION_STAGES = {json.dumps(production_stages, indent=4)} as const;"
    chain_map_str = f"export const PRODUCTION_CHAIN_MAP: {{ [key: string]: string[] }} = {json.dumps(chain_map, indent=4)};"
    colors_str = f"export const STAGE_COLORS: Record<string, string> = {json.dumps(colors, indent=4)};"

    with open(FRONTEND_CONSTANTS, 'r') as f:
        content = f.read()

    # Replacements using markers or regex
    content = re.sub(r"export const SERVICE_CATEGORIES = \[.*?\] as const;", categories_str, content, flags=re.DOTALL)
    content = re.sub(r"export const SERVICE_STAGES = \[.*?\] as const;", stages_str, content, flags=re.DOTALL)
    content = re.sub(r"export const PRODUCTION_STAGES = \[.*?\] as const;", prod_stages_str, content, flags=re.DOTALL)
    content = re.sub(r"export const PRODUCTION_CHAIN_MAP: \{ \[key: string\]: string\[\] \} = \{.*?\};", chain_map_str, content, flags=re.DOTALL)
    content = re.sub(r"export const STAGE_COLORS: Record<string, string> = \{.*?\};", colors_str, content, flags=re.DOTALL)

    with open(FRONTEND_CONSTANTS, 'w') as f:
        f.write(content)
    print(f"Updated {FRONTEND_CONSTANTS}")

if __name__ == "__main__":
    services = load_services()
    update_backend_models(services)
    update_frontend_constants(services)
    print("\nSync Complete!")
