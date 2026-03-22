import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from customers.models import Customer
from products.models import Product
from artisans.models import Artisan
from orders.models import Order, OrderItem
from jobs.models import Job, JobItem, JobDelivery, ServiceRate

class Command(BaseCommand):
    help = 'Seeds the database with mock data for the demo mode.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')
        
        with transaction.atomic():
            self.seed_customers()
            self.seed_products()
            self.seed_artisans()
            self.seed_service_rates()
            self.seed_orders()
            self.seed_jobs()
            
        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data.'))

    def seed_customers(self):
        customers_data = [
            {'name': 'John Doe', 'email': 'john@example.com', 'phone': '0712345678', 'address': '123 Main St, Nairobi'},
            {'name': 'Jane Smith', 'email': 'jane@example.com', 'phone': '0723456789', 'address': '456 Westlands, Nairobi'},
            {'name': 'Alice Johnson', 'email': 'alice@example.com', 'phone': '0734567890', 'address': '789 Kilimani, Nairobi'},
            {'name': 'Bob Brown', 'email': 'bob@example.com', 'phone': '0745678901', 'address': '101 Lavington, Nairobi'},
            {'name': 'Charlie Davis', 'email': 'charlie@example.com', 'phone': '0756789012', 'address': '202 Karen, Nairobi'},
        ]
        for data in customers_data:
            Customer.objects.get_or_create(name=data['name'], defaults=data)
        self.stdout.write(f'Seeded {len(customers_data)} customers.')

    def seed_products(self):
        product_types = [t[0] for t in Product.PRODUCT_TYPES]
        animal_types = ['Elephant', 'Giraffe', 'Lion', 'Rhino', 'Zebra', 'Hippo']
        sizes = [s[0] for s in Product.SIZE_CATEGORIES]
        
        products_created = 0
        for p_type in product_types[:5]:  # Limit to 5 types for demo
            for a_type in animal_types:
                size = random.choice(sizes)
                base_price = Decimal(random.randint(500, 5000))
                Product.objects.get_or_create(
                    product_type=p_type,
                    animal_type=a_type,
                    size_category=size,
                    defaults={'base_price': base_price}
                )
                products_created += 1
        self.stdout.write(f'Seeded {products_created} products.')

    def seed_artisans(self):
        artisans_data = [
            'Moses Kamau', 'Sarah Wanjiku', 'David Otieno', 'Grace Muthoni', 'Peter Onyango'
        ]
        for name in artisans_data:
            Artisan.objects.get_or_create(name=name, defaults={'phone': '0700000000'})
        self.stdout.write(f'Seeded {len(artisans_data)} artisans.')

    def seed_service_rates(self):
        products = Product.objects.all()
        categories = [c[0] for c in Product.SERVICE_CATEGORIES]
        
        rates_created = 0
        for product in products[:10]:  # Seed rates for first 10 products
            for category in categories[:3]:  # Seed first 3 categories
                rate = Decimal(random.randint(50, 500))
                ServiceRate.objects.get_or_create(
                    product=product,
                    service_category=category,
                    defaults={'rate_per_unit': rate}
                )
                rates_created += 1
        self.stdout.write(f'Seeded {rates_created} service rates.')

    def seed_orders(self):
        customers = Customer.objects.all()
        products = Product.objects.all()
        
        for i in range(10):  # Create 10 orders
            customer = random.choice(customers)
            order = Order.objects.create(
                customer=customer,
                status=random.choice(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
                notes=f'Demo order {i+1}'
            )
            
            # Add items to order
            for _ in range(random.randint(1, 3)):
                product = random.choice(products)
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=random.randint(1, 10),
                    unit_price=product.base_price
                )
            order.update_totals(save=True)
        self.stdout.write('Seeded 10 orders.')

    def seed_jobs(self):
        artisans = Artisan.objects.all()
        products = Product.objects.all()
        categories = [c[0] for c in Product.SERVICE_CATEGORIES]
        
        for i in range(5):  # Create 5 jobs
            category = random.choice(categories[:3])
            job = Job.objects.create(
                service_category=category,
                created_by='demo_seeder',
                status='IN_PROGRESS',
                notes=f'Demo job {i+1}'
            )
            
            # Add items to job
            for _ in range(random.randint(1, 3)):
                artisan = random.choice(artisans)
                # Select a product that has a rate for this category
                # For demo simplicity, we'll just pick any product and ensure it has a rate
                product = random.choice(products)
                ServiceRate.objects.get_or_create(
                    product=product,
                    service_category=category,
                    defaults={'rate_per_unit': Decimal(random.randint(50, 200))}
                )
                
                qty = random.randint(10, 50)
                JobItem.objects.create(
                    job=job,
                    artisan=artisan,
                    product=product,
                    quantity_ordered=qty,
                    quantity_received=0,
                    quantity_accepted=0
                )
        self.stdout.write('Seeded 5 jobs.')
