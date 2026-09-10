import django.db.models.deletion
from django.db import migrations, models

def populate_jobs_service_categories(apps, schema_editor):
    Job = apps.get_model('jobs', 'Job')
    ServiceRate = apps.get_model('jobs', 'ServiceRate')
    JobTransaction = apps.get_model('jobs', 'JobTransaction')
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

    for job in Job.objects.all():
        cat = get_or_create_cat(job.service_category)
        if cat:
            job.service_category_fk = cat
            job.save(update_fields=['service_category_fk'])

    for rate in ServiceRate.objects.all():
        cat = get_or_create_cat(rate.service_category)
        if cat:
            rate.service_category_fk = cat
            rate.save(update_fields=['service_category_fk'])

    for tx in JobTransaction.objects.all():
        from_cat = get_or_create_cat(tx.from_stage)
        to_cat = get_or_create_cat(tx.to_stage)
        update_fields = []
        if from_cat:
            tx.from_stage_fk = from_cat
            update_fields.append('from_stage_fk')
        if to_cat:
            tx.to_stage_fk = to_cat
            update_fields.append('to_stage_fk')
        if update_fields:
            tx.save(update_fields=update_fields)

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_rename_products_pr_product_2d36b6_idx_products_pr_product_8d7b6a_idx_and_more'),
        ('jobs', '0016_alter_job_status_rename_status_job__status_and_more'),
    ]

    operations = [
        # 1. Add temporary FK fields
        migrations.AddField(
            model_name='job',
            name='service_category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.AddField(
            model_name='servicerate',
            name='service_category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='job_service_rates', to='products.servicecategory'),
        ),
        migrations.AddField(
            model_name='jobtransaction',
            name='from_stage_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='transactions_from', to='products.servicecategory'),
        ),
        migrations.AddField(
            model_name='jobtransaction',
            name='to_stage_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='transactions_to', to='products.servicecategory'),
        ),
        # 2. Populate FK data
        migrations.RunPython(populate_jobs_service_categories, reverse_code=migrations.RunPython.noop),
        # 3. Drop constraint on ServiceRate
        migrations.AlterUniqueTogether(
            name='servicerate',
            unique_together=set(),
        ),
        # 4. Remove old char fields
        migrations.RemoveField(
            model_name='job',
            name='service_category',
        ),
        migrations.RemoveField(
            model_name='servicerate',
            name='service_category',
        ),
        migrations.RemoveField(
            model_name='jobtransaction',
            name='from_stage',
        ),
        migrations.RemoveField(
            model_name='jobtransaction',
            name='to_stage',
        ),
        # 5. Rename FK fields
        migrations.RenameField(
            model_name='job',
            old_name='service_category_fk',
            new_name='service_category',
        ),
        migrations.RenameField(
            model_name='servicerate',
            old_name='service_category_fk',
            new_name='service_category',
        ),
        migrations.RenameField(
            model_name='jobtransaction',
            old_name='from_stage_fk',
            new_name='from_stage',
        ),
        migrations.RenameField(
            model_name='jobtransaction',
            old_name='to_stage_fk',
            new_name='to_stage',
        ),
        # 6. Alter to non-null
        migrations.AlterField(
            model_name='job',
            name='service_category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='products.servicecategory'),
        ),
        migrations.AlterField(
            model_name='servicerate',
            name='service_category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='job_service_rates', to='products.servicecategory'),
        ),
        migrations.AlterField(
            model_name='jobtransaction',
            name='from_stage',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions_from', to='products.servicecategory'),
        ),
        migrations.AlterField(
            model_name='jobtransaction',
            name='to_stage',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions_to', to='products.servicecategory'),
        ),
        # 7. Restore unique together on ServiceRate
        migrations.AlterUniqueTogether(
            name='servicerate',
            unique_together={('product', 'service_category')},
        ),
    ]
