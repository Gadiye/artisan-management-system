
from django.test import TestCase
from decimal import Decimal
from jobs.models import Job, JobItem
from products.models import Product
from artisans.models import Artisan
from inventory.models import Inventory, InventoryReservation
from rest_framework.test import APIClient

class InventoryLeakTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            product_type="SITTING_ANIMAL",
            animal_type="Elephant",
            size_category="MEDIUM",
            base_price=Decimal("100.00"),
            unit_of_measure='ITEMS'
        )
        self.artisan = Artisan.objects.create(name="Expert Artisan")
        # Create initial inventory for DRAWING
        self.inv = Inventory.objects.create(
            product=self.product,
            service_category="DRAWING",
            quantity=100,
            average_cost=Decimal("50.00"),
            price_at_this_stage=Decimal("50.00")
        )

    def test_inventory_leak_on_job_deletion(self):
        """
        Confirm that deleting a job leaks inventory because reservations
        don't restore the quantity to the source inventory.
        """
        # 1. Create a CARVING job (which should reserve from DRAWING)
        job_data = {
            "service_category": "CUTTING", # CUTTING reserves from DRAWING
            "notes": "Testing inventory leak",
            "items": [
                {
                    "artisan": self.artisan.id,
                    "product": self.product.id,
                    "quantity_ordered": 20
                }
            ]
        }
        
        response = self.client.post("/api/jobs/", job_data, format='json')
        self.assertEqual(response.status_code, 201)
        
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 80, "Inventory should have decreased by 20")
        
        # 2. Delete the job
        job_id = response.data['job_id']
        del_response = self.client.delete(f"/api/jobs/{job_id}/")
        self.assertEqual(del_response.status_code, 204)
        
        # 3. Check inventory again
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, 100, "Inventory should have been RESTORED to 100")
