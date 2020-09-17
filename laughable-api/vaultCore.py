from py_tm_vault_client.tmvault import TMVaultClient
client = TMVaultClient('./data/vault-config.json')
​
def createVaultUser(usr_first_name, usr_last_name):
    tmp_user = client.customer.create_customer(
        first_name = usr_first_name,
        last_name = usr_last_name
    )
    client.accounts.create_account(
    product_id='current_account',
    stakeholder_customer_ids=[tmp_user.id_]
    return tmp_user.id_


def makePayment(source_id, destination_id, amount):
    src_account = client.accounts.get_account(source_id)
    dst_account = client.accounts.get_account(destination_id)
    client.payments.create_payment(
        amount=str(amount),
        debtor_account_id=source_id
        debtor_sort_code=src_account.uk_sort_code,
        debtor_account_number=src_account.uk_account_number,
        creditor_account_id=destination_id,
        creditor_sort_code=dst_account.uk_sort_code,
        creditor_account_number=dst_account.uk_account_number,
        reference='i laughed'
    )

def topUpAccount(usr_id):
    client.accounts.create_account(
    product_id='a_small_loan',
    stakeholder_customer_ids=[usr_id],
    instance_param_vals={'deposit_account': client.accounts.get_account(usr_id)}
    )
