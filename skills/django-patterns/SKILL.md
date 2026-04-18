---
name: django-patterns
description: Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.
origin: ECC
---

# Django Development Patterns

Production-grade Django architecture patterns for scalable, maintainable applications.

## When to Activate

- Building Django web applications
- Designing Django REST Framework APIs
- Working with Django ORM and models
- Setting up Django project structure
- Implementing caching, signals, middleware

## Project Structure

```
myproject/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── test.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── manage.py
└── apps/
    ├── users/
    │   ├── models.py
    │   ├── views.py
    │   ├── serializers.py
    │   ├── urls.py
    │   ├── permissions.py
    │   ├── services.py
    │   └── tests/
    └── products/
```

### Split Settings Pattern

```python
# config/settings/base.py
SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = False

# config/settings/development.py
from .base import *
DEBUG = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# config/settings/production.py
from .base import *
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## Model Design Patterns

### Custom QuerySet

```python
class ProductQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)

    def with_category(self):
        return self.select_related('category')

    def with_tags(self):
        return self.prefetch_related('tags')

    def search(self, query):
        return self.filter(
            models.Q(name__icontains=query) |
            models.Q(description__icontains=query)
        )

class Product(models.Model):
    objects = ProductQuerySet.as_manager()

# Usage
Product.objects.active().with_category().in_stock()
```

## Django REST Framework Patterns

### Serializer Patterns

```python
class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value
```

### ViewSet Patterns

```python
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('tags')
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        return ProductSerializer

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        product = self.get_object()
        result = ProductService().purchase(product, request.user)
        return Response(result, status=status.HTTP_201_CREATED)
```

## Service Layer Pattern

```python
class OrderService:
    @staticmethod
    @transaction.atomic
    def create_order(user, cart: Cart) -> Order:
        order = Order.objects.create(user=user, total_price=cart.total_price)
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order, product=item.product,
                quantity=item.quantity, price=item.product.price
            )
        cart.items.all().delete()
        return order
```

## Caching Strategies

```python
from django.core.cache import cache

def get_featured_products():
    cache_key = 'featured_products'
    products = cache.get(cache_key)
    if products is None:
        products = list(Product.objects.filter(is_featured=True))
        cache.set(cache_key, products, timeout=60 * 15)
    return products
```

## Signals

```python
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
```

## Performance Optimization

### N+1 Query Prevention

```python
# Bad - N+1 queries
products = Product.objects.all()
for product in products:
    print(product.category.name)

# Good - Single query with select_related
products = Product.objects.select_related('category').all()
```

### Bulk Operations

```python
Product.objects.bulk_create([
    Product(name=f'Product {i}', price=10.00)
    for i in range(1000)
])
```

## Quick Reference

| Pattern | Description |
|---------|-------------|
| Split settings | Separate dev/prod/test settings |
| Custom QuerySet | Reusable query methods |
| Service Layer | Business logic separation |
| ViewSet | REST API endpoints |
| select_related | Foreign key optimization |
| prefetch_related | Many-to-many optimization |
| Cache first | Cache expensive operations |
| Signals | Event-driven actions |
