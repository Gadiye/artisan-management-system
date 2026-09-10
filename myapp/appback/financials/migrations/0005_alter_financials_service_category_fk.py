import django.db.models.deletion
from django.db import migrations, models

def populate_financials_service_categories(apps, schema_editor):
    Payslip = apps.get_model('financials', 'Payslip')
    ServiceRate = apps.get_model('financials', 'ServiceRate')
    ServiceCategory = apps.get_model('products', 'ServiceCategory')
    
    category_map = {sc.name: sc for sc in ServiceCategory.objects.all()}
    
    def get_or_create_cat(name):
        if not name:
            return None
        if name in category_map:
            return category_map[name]
        cat, _ = ServiceCategory.objects.get_or_create(
            name=name,
            defaults={'display_name': str(name).title()}
        )
        category_map[name] = cat
        return cat

    for p in Payslip.objects.all():
        cat = get_or_create_cat(p.service_category)
        if cat:
            p.service_category_fk = cat
            p.save(update_fields=['service_category_fk'])

    for rate in ServiceRate.objects.all():
        cat = get_or_create_cat(rate.service_category)
        if cat:
            rate.service_category_fk = cat
            rate.save(update_fields=['service_category_fk'])

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_rename_products_pr_product_2d36b6_idx_products_pr_product_8d7b6a_idx_and_more'),
        ('financials', '0004_alter_advancededuction_date_deducted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='payslip',
            name='service_category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.AddField(
            model_name='servicerate',
            name='service_category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='financial_service_rates', to='products.servicecategory'),
        ),
        migrations.RunPython(populate_financials_service_categories, reverse_code=migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='servicerate',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='payslip',
            name='service_category',
        ),
        migrations.RemoveField(
            model_name='servicerate',
            name='service_category',
        ),
        migrations.RenameField(
            model_name='payslip',
            old_name='service_category_fk',
            new_name='service_category',
        ),
        migrations.RenameField(
            model_name='servicerate',
            old_name='service_category_fk',
            new_name='service_category',
        ),
        migrations.AlterField(
            model_name='payslip',
            name='service_category',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.AlterField(
            model_name='servicerate',
            name='service_category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='financial_service_rates', to='products.servicecategory'),
        ),
        migrations.AlterUniqueTogether(
            name='servicerate',
            unique_together={('product', 'service_category')},
        ),
    ]
