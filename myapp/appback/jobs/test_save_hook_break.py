
from django.test import TestCase
from decimal import Decimal
from jobs.models import Job, JobItem, JobDelivery
from jobs.services import record_job_delivery
from products.models import Product
from artisans.models import Artisan
from inventory.models import Inventory

class SaveHookBreakTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            product_type="SITTING_ANIMAL",
            animal_type="Elephant",
            size_category="MEDIUM",
            base_price=Decimal("100.00"),
            unit_of_measure='ITEMS'
        )
        self.artisan = Artisan.objects.create(name="Expert Artisan")
        self.job = Job.objects.create(
            created_by="admin",
            service_category="CARVING",
            status="IN_PROGRESS"
        )
        self.job_item = JobItem.objects.create(
            job=self.job,
            artisan=self.artisan,
            product=self.product,
            quantity_ordered=100
        )

    def test_average_cost_logic_with_service(self):
        """
        Verify that the record_job_delivery service correctly calculates average cost.
        """
        # First delivery of 10 items at base_price 100.00
        record_job_delivery(
            job_item=self.job_item,
            quantity_received=10,
            quantity_accepted=10
        )
        
        inventory = Inventory.objects.get(product=self.product, service_category="CARVING")
        self.assertEqual(inventory.average_cost, Decimal("100.00"))

        # Now change the product base price to 200.00 and add 10 more items
        self.product.base_price = Decimal("200.00")
        self.product.save()
        
        record_job_delivery(
            job_item=self.job_item,
            quantity_received=10,
            quantity_accepted=10
        )
        
        inventory.refresh_from_db()
        # CORRECT calculation:
        # (10 units * 100.00 + 10 units * 200.00) / 20 total units = 150.00
        
        self.assertEqual(inventory.average_cost, Decimal("150.00"))
        self.assertEqual(inventory.quantity, 20)
