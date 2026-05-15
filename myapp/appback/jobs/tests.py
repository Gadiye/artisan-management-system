from django.test import TestCase
from jobs.models import Job, JobItem
from products.models import Product
from artisans.models import Artisan

class ArtisanSpecialtyTest(TestCase):
    def setUp(self):
        # Create or get a product
        self.product = Product.objects.create(
            product_type="SITTING_ANIMAL",
            animal_type="TestAnimal",
            size_category="MEDIUM",
            base_price=10.0,
            is_active=True
        )
        self.artisan = Artisan.objects.create(name="Test Artisan")

    def test_specialties_includes_product_service_category(self):
        category = "DRAWING"
        job = Job.objects.create(
            created_by="Test User",
            service_category=category,
            status="IN_PROGRESS"
        )
        job_item = JobItem.objects.create(
            job=job,
            artisan=self.artisan,
            product=self.product,
            quantity_ordered=10
        )
        # Note: specialties property implementation might need to be verified in Artisan model
        # but for now we are just fixing the creation error
        self.assertIn(category, self.artisan.specialties_computed)