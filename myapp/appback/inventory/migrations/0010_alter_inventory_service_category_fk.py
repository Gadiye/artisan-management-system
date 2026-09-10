import django.db.models.deletion
from django.db import migrations, models

def populate_inventory_service_category(apps, schema_editor):
    Inventory = apps.get_model('inventory', 'Inventory')
    ServiceCategory = apps.get_model('products', 'ServiceCategory')
    category_map = {sc.name: sc for sc in ServiceCategory.objects.all()}
    
    for inv in Inventory.objects.all():
        val = inv.service_category
        if not val:
            continue
        if val in category_map:
            inv.service_category_fk = category_map[val]
        else:
            sc, _ = ServiceCategory.objects.get_or_create(
                name=val,
                defaults={'display_name': str(val).title()}
            )
            category_map[val] = sc
            inv.service_category_fk = sc
        inv.save(update_fields=['service_category_fk'])

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_rename_products_pr_product_2d36b6_idx_products_pr_product_8d7b6a_idx_and_more'),
        ('inventory', '0009_alter_inventory_service_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventory',
            name='service_category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.RunPython(populate_inventory_service_category, reverse_code=migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='inventory',
            unique_together=set(),
        ),
        migrations.RemoveIndex(
            model_name='inventory',
            name='inventory_i_product_d1d4d5_idx',
        ),
        migrations.RemoveField(
            model_name='inventory',
            name='service_category',
        ),
        migrations.RenameField(
            model_name='inventory',
            old_name='service_category_fk',
            new_name='service_category',
        ),
        migrations.AlterField(
            model_name='inventory',
            name='service_category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.AlterUniqueTogether(
            name='inventory',
            unique_together={('product', 'service_category')},
        ),
        migrations.AddIndex(
            model_name='inventory',
            index=models.Index(fields=['product', 'service_category'], name='inventory_i_product_d1d4d5_idx'),
        ),
    ]
