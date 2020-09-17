from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from config import Config
from py_tm_vault_client.tmvault import TMVaultClient

app = Flask(__name__)
# app.config["DEBUG"] = True
app.config.from_object(Config)
CORS(app)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
vault_client = TMVaultClient('./data/vault-config.json')

from app import routes, models
