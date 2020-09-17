from flask import request, jsonify

from app import app, db, vault_client
from app.models import User


@app.route('/')
def index():
    return "wrong path retard"


@app.route('/api/v1/add_user', methods=['POST'])
def add_user():
    data = request.get_json()
    first_name = data['first_name']
    last_name = data['last_name']

    vault_customer = vault_client.customers.create_customer(
        first_name=first_name,
        last_name=last_name
    )
    vault_account = vault_client.accounts.create_account(
        product_id='current_account',
        stakeholder_customer_ids=[vault_customer.id_]
    )

    user = User(
        first_name=first_name,
        last_name=last_name,
        vault_customer_id=vault_customer.id_,
        vault_account_id=vault_account.id_
    )
    db.session.add(user)
    db.session.commit()
    response = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "vault_id": user.vault_customer_id
    }
    # return Response(jsonify(response), mimetype='application/json')
    return jsonify(response)


@app.route('/api/v1/transaction', methods=['POST'])
def transaction():
    data = request.get_json()
    sender_id = data['sender']
    receiver_id = data['receiver']
    amount = data['amount']
    sender = User.query.filter_by(id=sender_id).first()
    receiver = User.query.filter_by(id=receiver_id).first()

    sender_customer = vault_client.customers.get_customer(sender.vault_customer_id)
    receiver_customer = vault_client.customers.get_customer(receiver.vault_customer_id)
    sender_account = vault_client.accounts.get_account(sender.vault_account_id)
    receiver_account = vault_client.accounts.get_account(receiver.vault_account_id)
    vault_client.payments.create_payment(
        amount=str(amount),
        debtor_account_id=sender_account.id_,
        debtor_sort_code=sender_account.uk_sort_code,
        debtor_account_number=sender_account.uk_account_number,
        creditor_account_id=receiver_account.id_,
        creditor_sort_code=receiver_account.uk_sort_code,
        creditor_account_number=receiver_account.uk_account_number,
        reference='money'
    )

    app.logger.info("Sent {} from {} to {}".format(amount, sender, receiver))

    response = jsonify({
        'sender_fname': sender.first_name,
        'receiver_fname': receiver.first_name,
        'amount': amount
    })
    return response
