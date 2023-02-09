#!/bin/sh

# This script is used to initialize the database for the first time.
dbName = "self-hosted-cloud" # The name to give of the database
mongosh
use "$dbName" # Creates the database
# Exits the mongodb shell
exit
