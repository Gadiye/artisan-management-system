
import csv
from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date
from jobs.models import Job, JobItem, JobDelivery
from customers.models import Customer
from products.models import Product
from artisans.models import Artisan
from inventory.models import Inventory, FinishedStock

class Command(BaseCommand):
    help = 'Imports jobs from a CSV file.'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='The path to the CSV file to import.')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Runs the import without saving any data to the database.',
        )

    def handle(self, *args, **options):
        csv_file_path = options['csv_file']
        is_dry_run = options['dry_run']

        if is_dry_run:
            self.stdout.write(self.style.SUCCESS('Running in dry-run mode. No data will be saved.'))

        try:
            with open(csv_file_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.process_row(row, is_dry_run)
        except FileNotFoundError:
            raise CommandError(f'File "{csv_file_path}" does not exist.')

        self.stdout.write(self.style.SUCCESS('Successfully imported jobs.'))

    def process_row(self, row, is_dry_run):
        try:
            # Parse data from the row
            job_creation_date = parse_date(row['job_creation_date'])
            job_service_category = row['job_service_category']
            job_notes = row['job_notes']
            product_type = row['product_type']
            product_animal_type = row['product_animal_type']
            product_size_category = row['product_size_category']
            artisan_name = row['artisan_name']
            quantity_ordered = int(row['quantity_ordered'])
            quantity_accepted = int(row['quantity_accepted'])
            quantity_rejected = int(row['quantity_rejected'])
            rejection_reason = row['rejection_reason'] if row['rejection_reason'] else None
            delivery_date = parse_date(row['delivery_date'])
            is_paid = row['is_paid'].lower() == 'true'

            # Get or create Product
            product, created = Product.objects.get_or_create(
                product_type=product_type,
                animal_type=product_animal_type,
                size_category=product_size_category,
                defaults={'base_price': 0} # Assuming a default base price
            )
            if created and not is_dry_run:
                self.stdout.write(self.style.SUCCESS(f'Created new product: {product}'))

            # Get or create Artisan
            artisan, created = Artisan.objects.get_or_create(
                name=artisan_name
            )
            if created and not is_dry_run:
                self.stdout.write(self.style.SUCCESS(f'Created new artisan: {artisan}'))

            if not is_dry_run:
                # Create Job
                job = Job.objects.create(
                    created_date=job_creation_date,
                    service_category=job_service_category,
                    notes=job_notes,
                    created_by='import_script'
                )

                # Create JobItem
                job_item = JobItem.objects.create(
                    job=job,
                    artisan=artisan,
                    product=product,
                    quantity_ordered=quantity_ordered,
                    final_payment=0, # Set final_payment to 0 for historical paid jobs
                    payslip_generated=is_paid,
                )

                # Create JobDelivery
                JobDelivery.objects.create(
                    job_item=job_item,
                    quantity_received=quantity_ordered - quantity_rejected, # Assuming received = ordered - rejected
                    quantity_accepted=quantity_accepted,
                    rejection_reason=rejection_reason,
                    delivery_date=delivery_date
                )
                
                self.stdout.write(self.style.SUCCESS(f'Successfully processed job for product: {product}'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing row: {row} - {e}'))
