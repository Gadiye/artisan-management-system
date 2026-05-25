import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import User
from customers.models import Customer
from products.models import Product
from artisans.models import Artisan
from orders.models import Order, OrderItem
from jobs.models import Job, JobItem, JobDelivery, ServiceRate
from jobs.services import update_job_status
from inventory.models import Inventory, FinishedStock

def random_date_in_past(max_days_ago=90, min_days_ago=0):
    now = timezone.now()
    start = now - timezone.timedelta(days=max_days_ago)
    end = now - timezone.timedelta(days=min_days_ago)
    random_seconds = random.randint(0, int((end - start).total_seconds()))
    return start + timezone.timedelta(seconds=random_seconds)

class Command(BaseCommand):
    help = 'Seeds the database with a trimester worth of mock data.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data (approx. 3 months of history)...')
        
        with transaction.atomic():
            self.seed_users()
            self.seed_customers()
            self.seed_products()
            self.seed_artisans()
            self.seed_service_rates()
            self.seed_inventory()
            self.seed_jobs()
            self.seed_orders()
            
        self.stdout.write(self.style.SUCCESS('Successfully seeded historical demo data.'))

    def seed_users(self):
        if not User.objects.filter(username='demo_admin').exists():
            User.objects.create_superuser('demo_admin', 'admin@example.com', 'demo_password')
            self.stdout.write('Seeded demo_admin user.')

    def seed_customers(self):
        first_names = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Karen', 'Liam', 'Mia']
        last_names = ['Doe', 'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson']
        areas = ['Westlands', 'Kilimani', 'Lavington', 'Karen', 'Kileleshwa', 'Ngong Road', 'Runda', 'Muthaiga']
        
        created = 0
        for _ in range(25):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            customer, was_created = Customer.objects.get_or_create(
                name=name,
                defaults={
                    'email': f"{name.lower().replace(' ', '.')}@example.com",
                    'phone': f"07{random.randint(10000000, 99999999)}",
                    'address': f"{random.randint(1, 200)} {random.choice(areas)}, Nairobi"
                }
            )
            if was_created:
                # Bypass auto_now_add by bulk updating
                Customer.objects.filter(pk=customer.pk).update(created_date=random_date_in_past())
                created += 1
        self.stdout.write(f'Seeded {created} customers.')

    def seed_products(self):
        product_types = [t[0] for t in Product.PRODUCT_TYPES]
        animal_types = ['Elephant', 'Giraffe', 'Lion', 'Rhino', 'Zebra', 'Hippo', 'Cheetah', 'Leopard']
        sizes = [s[0] for s in Product.SIZE_CATEGORIES]
        
        products_created = 0
        for p_type in product_types[:10]:
            for a_type in animal_types[:4]:
                size = random.choice(sizes[:4])
                base_price = Decimal(random.randint(5, 50) * 100)
                Product.objects.get_or_create(
                    product_type=p_type,
                    animal_type=a_type,
                    size_category=size,
                    defaults={'base_price': base_price}
                )
                products_created += 1
        self.stdout.write(f'Seeded {products_created} products.')

    def seed_artisans(self):
        names = ['Moses Kamau', 'Sarah Wanjiku', 'David Otieno', 'Grace Muthoni', 'Peter Onyango', 'Joyce Njoroge', 'Samuel Kipkorir', 'Esther Achieng', 'John Mwangi', 'Mary Nduta']
        created = 0
        for name in names:
            artisan, was_created = Artisan.objects.get_or_create(
                name=name, 
                defaults={'phone': f"07{random.randint(10000000, 99999999)}"}
            )
            if was_created:
                Artisan.objects.filter(pk=artisan.pk).update(created_date=random_date_in_past())
                created += 1
        self.stdout.write(f'Seeded {created} artisans.')

    def seed_service_rates(self):
        products = Product.objects.all()
        categories = [c[0] for c in Product.SERVICE_CATEGORIES]
        
        rates_created = 0
        for product in products:
            for category in categories[:5]:
                ServiceRate.objects.get_or_create(
                    product=product,
                    service_category=category,
                    defaults={'rate_per_unit': Decimal(random.randint(5, 50) * 10)}
                )
                rates_created += 1
        self.stdout.write(f'Seeded {rates_created} service rates.')

    def seed_inventory(self):
        products = Product.objects.all()
        categories = [c[0] for c in Product.SERVICE_CATEGORIES]
        
        inventory_created = 0
        stock_created = 0
        for product in products:
            if random.random() < 0.7:  # 70% chance to have WIP
                category = random.choice(categories[:4])
                Inventory.objects.get_or_create(
                    product=product,
                    service_category=category,
                    defaults={
                        'quantity': random.randint(10, 150),
                        'average_cost': Decimal(random.randint(100, 500)),
                        'price_at_this_stage': Decimal(random.randint(100, 500))
                    }
                )
                inventory_created += 1
            
            if random.random() < 0.6:  # 60% chance to have stock
                FinishedStock.objects.get_or_create(
                    product=product,
                    defaults={
                        'quantity': random.randint(5, 100),
                        'average_cost': Decimal(random.randint(500, 1500))
                    }
                )
                stock_created += 1
                
        self.stdout.write(f'Seeded {inventory_created} WIP inventory records and {stock_created} finished stock records.')

    def seed_jobs(self):
        artisans = Artisan.objects.all()
        products = Product.objects.all()
        categories = [c[0] for c in Product.SERVICE_CATEGORIES]
        
        for i in range(150):  # 150 jobs over 90 days
            job_date = random_date_in_past(max_days_ago=90)
            category = random.choice(categories[:5])
            
            status_choices = ['COMPLETED'] * 60 + ['PARTIALLY_RECEIVED'] * 20 + ['IN_PROGRESS'] * 20
            target_status = random.choice(status_choices)
            
            job = Job.objects.create(
                service_category=category,
                created_by='demo_admin',
                created_date=job_date,
                status='IN_PROGRESS',  # Set later
                notes=f'Demo job for {category.lower()} - trimester batch'
            )
            
            # 1 to 4 items per job
            for _ in range(random.randint(1, 4)):
                artisan = random.choice(artisans)
                product = random.choice(products)
                
                ServiceRate.objects.get_or_create(
                    product=product,
                    service_category=category,
                    defaults={'rate_per_unit': Decimal(random.randint(50, 300))}
                )
                
                qty_ordered = random.randint(20, 100)
                qty_received = 0
                
                if target_status == 'COMPLETED':
                    qty_received = qty_ordered
                elif target_status == 'PARTIALLY_RECEIVED':
                    qty_received = random.randint(1, qty_ordered - 1)
                
                job_item = JobItem.objects.create(
                    job=job,
                    artisan=artisan,
                    product=product,
                    quantity_ordered=qty_ordered,
                    quantity_received=0,
                    quantity_accepted=0
                )
                
                if qty_received > 0:
                    delivery_date = job_date + timezone.timedelta(days=random.randint(1, max(1, (timezone.now() - job_date).days)))
                    qty_accepted = int(qty_received * 0.95)
                    JobDelivery.objects.create(
                        job_item=job_item,
                        quantity_received=qty_received,
                        quantity_accepted=qty_accepted,
                        delivery_date=delivery_date
                    )
                    
                    # Also create a transaction so 'Trace' button shows data
                    from jobs.models import JobTransaction
                    jt = JobTransaction.objects.create(
                        job=job,
                        product=product,
                        from_stage=category,
                        to_stage=category,
                        quantity=qty_accepted
                    )
                    # Bypass auto_now_add to set historical date
                    JobTransaction.objects.filter(pk=jt.pk).update(timestamp=delivery_date)
            job.refresh_from_db()
            update_job_status(job)
        self.stdout.write('Seeded 150 jobs with historical deliveries.')

    def seed_orders(self):
        customers = Customer.objects.all()
        products = Product.objects.all()
        
        for i in range(200):  # 200 orders over 90 days
            order_date = random_date_in_past(max_days_ago=90)
            customer = random.choice(customers)
            
            # Orders older than 10 days are usually delivered/shipped
            days_ago = (timezone.now() - order_date).days
            if days_ago > 14:
                status = random.choice(['SHIPPED', 'DELIVERED'] * 5 + ['CANCELLED'])
            else:
                status = random.choice(['PENDING', 'PROCESSING', 'SHIPPED'])
                
            order = Order.objects.create(
                customer=customer,
                status=status,
                notes=f'Historical demo order {i+1}'
            )
            Order.objects.filter(pk=order.pk).update(created_date=order_date)
            
            for _ in range(random.randint(1, 6)):
                product = random.choice(products)
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=random.randint(2, 50),
                    unit_price=product.base_price
                )
            
            # Reload to get related objects for update_totals
            order = Order.objects.get(pk=order.pk)
            order.update_totals(save=True)
            
        self.stdout.write('Seeded 200 historical orders.')
