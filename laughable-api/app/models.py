from app import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    # TODO change this to the real constraint
    vault_customer_id = db.Column(db.String(100))
    vault_account_id = db.Column(db.String(100))

    def __repr__(self):
        return '<User {} {} {} {}>'.format(self.first_name, self.last_name, self.vault_customer_id,
                                           self.vault_account_id)
