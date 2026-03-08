import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.test import RequestFactory
from jobs.views import JobViewSet

factory = RequestFactory()
request = factory.get('/api/jobs/production-guide/')
view = JobViewSet.as_view({'get': 'production_guide'})
response = view(request)
print("STATUS:", response.status_code)
print("DATA:", response.data)
