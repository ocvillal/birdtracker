"""
This file defines the database models
"""

import csv
from datetime import datetime
from datetime import datetime
from .common import db, Field, auth #, get_user_email
from pydal.validators import *

def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()


### Define your table below
#
# db.define_table('thing', Field('name'))
#
## always commit your models to avoid problems later

# db table for checklists.csv
db.define_table(
    'checklists',
    Field('sampling_event_id', 'string', requires=IS_NOT_EMPTY()),
    Field('latitude', 'float', requires=IS_NOT_EMPTY()),
    Field('longitude', 'float', requires=IS_NOT_EMPTY()),
    Field('observation_date_time', 'date', requires=IS_NOT_EMPTY()), # Use 'date' type
    Field('observer_id', 'string', default=get_user_email),
    Field('duration_minutes', 'float', requires=IS_NOT_EMPTY()),
)

# db table for sightings.csv
db.define_table(
    'sightings',
    Field('sampling_event_id', 'string', requires=IS_NOT_EMPTY()),
    Field('common_name', 'string', requires=IS_NOT_EMPTY()),
    Field('observation_count', 'integer', requires=IS_NOT_EMPTY()),
)

# db table for species.csv
db.define_table(
    'species',
    Field('common_name', 'string', requires=IS_NOT_EMPTY()),
)
# Function to prime the database with sample data

def load_data():
    if db(db.species).isempty():
        with open('species.csv', 'r') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header row
            for row in reader:
                db.species.insert(common_name=row[0])

    if db(db.checklists).isempty():
        with open('checklists.csv', 'r') as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                row_datetime = "{} {}".format(row[3], row[4])
                try:
                    curdatetime = datetime.strptime(row_datetime, "%Y-%m-%d %H:%M:%S")
                except ValueError as e:
                    continue
                
                try: 
                    observed_mins = float(row[6])
                except ValueError:
                    observed_mins = 0
                db.checklists.insert(
                    sampling_event_id=row[0],
                    latitude=float(row[1]),
                    longitude=float(row[2]),
                    observation_date_time=curdatetime,
                    duration_minutes=observed_mins,
                    observer_id=row[5]
                )

    if db(db.sightings).isempty():
        with open('sightings.csv', 'r') as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                try: 
                    observation_count = int(row[2])
                except ValueError:
                    observation_count = 0
                db.sightings.insert(
                    sampling_event_id=row[0],
                    common_name=row[1],
                    observation_count=observation_count
                )

# Load data into the database
load_data()

# # Function to clear all tables
# def clear_all_tables():
#     for table_name in db.tables:
#         db(db[table_name].id > 0).delete()
#     db.commit()

# clear_all_tables()

db.commit()
