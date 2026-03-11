from django.db import models
from django.core.validators import MinValueValidator

class Product(models.Model):
    PRODUCT_TYPES = [
        ('SITTING_ANIMAL', 'Sitting Animal'),
        ('YOGA_BOWLS', 'Yoga Bowls'),
        ('PER_DAY', 'Per Day'),
        ('YOGA_ANIMALS', 'Yoga Animals'),
        ('CHOPSTICK_HOLDERS', 'Chopstick Holders'),
        ('STANDING_ANIMAL', 'Standing Animal'),
        ('BOTTLE_CORKS', 'Bottle Corks'),
        ('SANTA_YOGA_BOWLS', 'Santa Yoga Bowls'),
        ('SANTA_YOGA_ANIMALS', 'Santa Yoga Animals'),
        ('HEAD_BOWLS', 'Head Bowls'),
        ('DRINKING_BOWLS', 'Drinking Bowls'),
        ('ANIMAL_MASKS', 'Animal Masks'),
        ('CHOPSTICK_HEADS', 'Chopstick Heads'),
        ('CHESS_UNITS', 'Chess Units'),
        ('STOOL_SET', 'Stool Set'),
        ('SALAD_SERVERS_PAIR', 'Salad Servers (in pairs)'),
        ('WALKING_ANIMAL', 'Walking Animal'),
        ('PLACE_CARD_HOLDER', 'Place Card Holder'),
        ('SANTA_ANIMALS', 'Santa Animals'),
        ('SUGAR_SPOONS', 'Sugar Spoons'),
        ('COCKTAIL_STICKS', 'Cocktail Sticks'),
        ('KEY_HOLDERS', 'Key Holders'),
        ('FLAT_MAGNETS', 'Flat Magnets'),
        ('PLAY_ANIMALS', 'Play Animals'),
        ('CHOPSTICKS', 'Chopsticks'),
        ('X_MAS_DECO', 'X-Mas Deco'),
        ('FORKS', 'Forks'),
        ('BUTTER_KNIFE', 'Butter Knife'),
        ('LETTER_OPENER', 'Letter Opener'),
        ('JAM_SCOOPERS', 'Jam Scoopers'),
        ('NAPKIN_HOLDERS', 'Napkin Holders'),
        ('HAIR_COMBS', 'Hair Combs'),
        ('PAPER_WEIGHTS', 'Paper Weights'),
        ('TRAINING_CHOPSTICKS', 'Training Chopsticks'),
    ]
    
    SERVICE_CATEGORIES = [
        ('DRAWING', 'Drawing'),
        ('CARVING', 'Carving'),
        ('CUTTING', 'Cutting'),
        ('GOUGING', 'Gouging'),
        ('SANDING', 'Sanding'),
        ('PAINTING', 'Painting'),
        ('FINISHING', 'Finishing'),
        ('FINISHED', 'Finished'),
    ]
    
    SIZE_CATEGORIES = [
        ('SMALL', 'Small'),
        ('MEDIUM', 'Medium'),
        ('LARGE', 'Large'),
        ('WITH CLOTHES', 'With Clothes'),
        ('WITH DRESS', 'With Dress'),
        ('WITH SUIT', 'With Suit'),
        ('WITH OVERALL', 'With Overall'),
        ('4IN', '4 Inch'),
        ('8X8', '8x8'),
        ('6X6', '6x6'),
        ('5X4', '5x4'),
        ('XMAS DRESS', 'Xmas Dress'),
        ('IN PAIRS', 'In Pairs'),
        ('12IN', '12 Inch'),
        ('8IN', '8 Inch'),
        ('N/A', 'Not Applicable'),
        ('2D', '2D'),
        ('3D', '3D'),
        ('SHORT', 'Short'),
        ('LONG', 'Long'),
        ('THIN TIP', 'Thin Tip'),
        ('THICK TIP', 'Thick Tip'),
        ('NORMAL', 'Normal'),
        ('BOTTOMS UP', 'Bottoms Up'),
    ]
    
    product_type = models.CharField(max_length=50, choices=PRODUCT_TYPES)
    animal_type = models.CharField(max_length=50)
    
    size_category = models.CharField(max_length=20, choices=SIZE_CATEGORIES, default='MEDIUM')
    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    last_price_update = models.DateTimeField(auto_now=True)
    unit_of_measure = models.CharField(max_length=10, choices=[('ITEMS', 'Items'), ('PAIRS', 'Pairs')], default='ITEMS')
    
    class Meta:
        ordering = ['id']
        unique_together = ['product_type', 'animal_type', 'size_category']
        indexes = [
            models.Index(fields=['product_type', 'animal_type']),
        ]
    
    def __str__(self):
        return f"{self.product_type} - {self.animal_type} ({self.size_category})"
    
    def get_price_history(self):
        return self.price_history.order_by('-effective_date')

class PriceHistory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    effective_date = models.DateTimeField(auto_now_add=True)
    changed_by = models.CharField(max_length=100)
    reason = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-effective_date']