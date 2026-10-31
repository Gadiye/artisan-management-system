# Generated manually for finished stock movement history and stock levels.

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_rename_products_pr_product_2d36b6_idx_products_pr_product_8d7b6a_idx_and_more'),
        ('inventory', '0010_alter_inventory_service_category_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='finishedstock',
            name='max_level',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Alert when quantity is above this level. Use 0 to disable overstock alerts.',
            ),
        ),
        migrations.AddField(
            model_name='finishedstock',
            name='reorder_level',
            field=models.PositiveIntegerField(
                default=5,
                help_text='Alert when quantity is at or below this level.',
            ),
        ),
        migrations.CreateModel(
            name='FinishedStockMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('movement_type', models.CharField(choices=[('IN', 'Stock in'), ('OUT', 'Stock out')], max_length=3)),
                ('quantity', models.PositiveIntegerField(help_text='Absolute quantity moved.')),
                ('balance_after', models.PositiveIntegerField(help_text='Finished stock balance after the movement.')),
                ('average_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
                ('reference', models.CharField(blank=True, max_length=150)),
                ('note', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='finished_stock_movements', to='products.product')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['product', 'created_at'], name='inv_fin_move_prod_created')],
            },
        ),
    ]
