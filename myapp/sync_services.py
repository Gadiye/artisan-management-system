import argparse
import json
import os
import re
import sys

# File Paths
SERVICES_JSON = 'services.json'
BACKEND_PRODUCT_MODEL = 'appback/products/models.py'
BACKEND_JOB_MODEL = 'appback/jobs/models.py'
BACKEND_INVENTORY_MODEL = 'appback/inventory/models.py'
BACKEND_JOB_SERIALIZER = 'appback/jobs/serializers.py'
FRONTEND_CONSTANTS = 'my-app/lib/constants.ts'
FRONTEND_TYPES = 'my-app/types/index.ts'
FRONTEND_PRICING_PAGE = 'my-app/app/pricing/page.tsx'

def load_services():
    with open(SERVICES_JSON, 'r') as f:
        return json.load(f)['services']

def save_services(services):
    with open(SERVICES_JSON, 'w') as f:
        json.dump({"services": services}, f, indent=2)

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

def update_backend_serializers(services):
    fields = ["    size = serializers.CharField()"]
    for s in services:
        if s['id'] == 'FINISHED': continue
        field_name = s['id'].capitalize()
        fields.append(f"    {field_name} = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)")
    fields_str = "\n".join(fields) + "\n"
    with open(BACKEND_JOB_SERIALIZER, 'r') as f:
        content = f.read()
    
    # Update RateDetailSerializer
    pattern = r"(class RateDetailSerializer\(serializers\.Serializer\):\n\s+\"\"\"[^\"]*\"\"\"\n)(.*?)(?=\nclass)"
    content = re.sub(pattern, rf"\1{fields_str}", content, flags=re.DOTALL)
    
    # Update PRODUCTION_CHAIN_MAP in JobItemCreateUpdateSerializer
    chain_map = {s['id']: s['depends_on'] for s in services if s['depends_on']}
    chain_map_str = "        PRODUCTION_CHAIN_MAP = " + json.dumps(chain_map, indent=12).replace('}', '        }')
    
    pattern = r"(        PRODUCTION_CHAIN_MAP = \{)(.*?)(\s+\})"
    content = re.sub(pattern, chain_map_str, content, flags=re.DOTALL)

    with open(BACKEND_JOB_SERIALIZER, 'w') as f:
        f.write(content)
    print(f"Updated {BACKEND_JOB_SERIALIZER}")

def update_frontend_constants(services):
    # SERVICE_CATEGORIES: All stages that can be assigned to a Job (exclude only FINISHED state)
    service_categories = [s['id'] for s in services if s['id'] != 'FINISHED']
    # SERVICE_STAGES: All stages for the pipeline logic
    service_stages = [s['id'] for s in services]
    # PRODUCTION_STAGES: Stages where work is done (exclude the terminal "FINISHED" state)
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
    content = re.sub(r"export const SERVICE_CATEGORIES = \[.*?\] as const;", categories_str, content, flags=re.DOTALL)
    content = re.sub(r"export const SERVICE_STAGES = \[.*?\] as const;", stages_str, content, flags=re.DOTALL)
    content = re.sub(r"export const PRODUCTION_STAGES = \[.*?\] as const;", prod_stages_str, content, flags=re.DOTALL)
    content = re.sub(r"export const PRODUCTION_CHAIN_MAP: \{ \[key: string\]: string\[\] \} = \{.*?\};", chain_map_str, content, flags=re.DOTALL)
    content = re.sub(r"export const STAGE_COLORS: Record<string, string> = \{.*?\};", colors_str, content, flags=re.DOTALL)
    with open(FRONTEND_CONSTANTS, 'w') as f:
        f.write(content)
    print(f"Updated {FRONTEND_CONSTANTS}")

def update_frontend_types(services):
    fields = ["    size: string;"]
    for s in services:
        if s['id'] == 'FINISHED': continue
        field_name = s['id'].capitalize()
        fields.append(f"    {field_name}?: number;")
    fields_str = "\n".join(fields) + "\n"
    with open(FRONTEND_TYPES, 'r') as f:
        content = f.read()
    pattern = r"(export interface HierarchicalRate \{\n  product_category: string;\n  animal: string;\n  rates: \{\n)(.*?)(\s+\}\[\];\n\})"
    new_content = re.sub(pattern, rf"\1{fields_str}\3", content, flags=re.DOTALL)
    with open(FRONTEND_TYPES, 'w') as f:
        f.write(new_content)
    print(f"Updated {FRONTEND_TYPES}")


def sync_all():
    services = load_services()
    update_backend_models(services)
    update_backend_serializers(services)
    update_frontend_constants(services)
    update_frontend_types(services)
    print("\nSync Complete!")

def add_service(args):
    services = load_services()
    sid = args.id.upper()
    if any(s['id'] == sid for s in services):
        print(f"Error: Service {sid} already exists.")
        sys.exit(1)
    
    existing_ids = [s['id'] for s in services]
    for dep in args.depends_on:
        if dep.upper() not in existing_ids:
            print(f"Warning: Dependency '{dep}' not found in current services.")

    new_service = {
        "id": sid,
        "label": args.label,
        "color": args.color or "bg-gray-100 text-gray-800",
        "depends_on": [d.upper() for d in args.depends_on]
    }
    
    # Insert before 'FINISHED' if it exists, otherwise at the end
    finished_index = next((i for i, s in enumerate(services) if s['id'] == 'FINISHED'), -1)
    if finished_index != -1:
        services.insert(finished_index, new_service)
    else:
        services.append(new_service)
    
    save_services(services)
    print(f"Added service {sid} to {SERVICES_JSON}")
    sync_all()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync service configurations across backend and frontend.")
    subparsers = parser.add_subparsers(dest="command")

    # Sync Command
    subparsers.add_parser("sync", help="Synchronize existing services.json to all files.")

    # Add Command
    add_parser = subparsers.add_parser("add", help="Add a new service category.")
    add_parser.add_argument("--id", required=True, help="Unique ID (e.g., GOUGING)")
    add_parser.add_argument("--label", required=True, help="Display Label (e.g., Gouging)")
    add_parser.add_argument("--color", help="Tailwind color class (e.g., 'bg-amber-100 text-amber-800')")
    add_parser.add_argument("--depends-on", nargs="*", default=[], help="IDs this stage depends on")

    args = parser.parse_args()

    if args.command == "add":
        add_service(args)
    elif args.command == "sync" or args.command is None:
        sync_all()
    else:
        parser.print_help()
