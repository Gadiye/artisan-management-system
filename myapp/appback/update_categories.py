import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'appback.settings')
django.setup()

from products.models import ServiceCategory

PRODUCTION_CHAIN_MAP = {
    "CUTTING": ["DRAWING"],
    "GOUGING": ["CUTTING"],
    "SANDING": ["CUTTING", "CARVING"],
    "PAINTING": ["SANDING"],
    "FINISHING": ["PAINTING"],
    "FINISHED": ["FINISHING"]
}

for cat_name, prev_names in PRODUCTION_CHAIN_MAP.items():
    try:
        cat = ServiceCategory.objects.get(name=cat_name)
        for prev in prev_names:
            try:
                prev_cat = ServiceCategory.objects.get(name=prev)
                cat.previous_categories.add(prev_cat)
            except ServiceCategory.DoesNotExist:
                print(f"Warning: Previous category {prev} not found.")
        cat.save()
        print(f"Updated {cat_name}")
    except ServiceCategory.DoesNotExist:
        print(f"Warning: Category {cat_name} not found.")

