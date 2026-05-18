import os
import dj_database_url

os.environ['DATABASE_URL'] = 'postgres://PROD'
os.environ['DEMO_DATABASE_URL'] = 'postgres://DEMO'
os.environ['DEMO_MODE'] = 'True'

DEMO_MODE = True
db_url = os.environ.get('DEMO_DATABASE_URL') if DEMO_MODE else os.environ.get('DATABASE_URL')

config = dj_database_url.config(
    default=db_url
)

print(config)

config2 = dj_database_url.config(
    env='DEMO_DATABASE_URL' if DEMO_MODE else 'DATABASE_URL',
    default=db_url
)
print("Fix:")
print(config2)
