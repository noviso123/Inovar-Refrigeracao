import crcmod
import logging

logger = logging.getLogger(__name__)

class PixPayload:
    def __init__(self, chave_pix, valor, nome_recebedor, cidade_recebedor, txt_id="0500"):
        self.chave_pix = chave_pix
        self.valor = str(valor)
        self.nome_recebedor = nome_recebedor
        self.cidade_recebedor = cidade_recebedor
        self.txt_id = txt_id

        # IDs das Tags EMV do PIX
        self.ID_PAYLOAD_FORMAT_INDICATOR = '00'
        self.ID_MERCHANT_ACCOUNT_INFORMATION = '26'
        self.ID_MERCHANT_ACCOUNT_INFORMATION_GUI = '00'
        self.ID_MERCHANT_ACCOUNT_INFORMATION_KEY = '01'
        self.ID_MERCHANT_ACCOUNT_INFORMATION_DESCRIPTION = '02'
        self.ID_MERCHANT_CATEGORY_CODE = '52'
        self.ID_TRANSACTION_CURRENCY = '53'
        self.ID_TRANSACTION_AMOUNT = '54'
        self.ID_COUNTRY_CODE = '58'
        self.ID_MERCHANT_NAME = '59'
        self.ID_MERCHANT_CITY = '60'
        self.ID_ADDITIONAL_DATA_FIELD_TEMPLATE = '62'
        self.ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID = '05'
        self.ID_CRC16 = '63'

    def _get_value(self, id, value):
        size = str(len(value)).zfill(2)
        return f"{id}{size}{value}"

    def _get_merchant_account_info(self):
        gui = self._get_value(self.ID_MERCHANT_ACCOUNT_INFORMATION_GUI, 'br.gov.bcb.pix')
        key = self._get_value(self.ID_MERCHANT_ACCOUNT_INFORMATION_KEY, self.chave_pix)
        return self._get_value(self.ID_MERCHANT_ACCOUNT_INFORMATION, f"{gui}{key}")

    def _get_additional_data_field(self):
        txid = self._get_value(self.ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID, self.txt_id)
        return self._get_value(self.ID_ADDITIONAL_DATA_FIELD_TEMPLATE, txid)

    def generate_payload(self):
        payload = (
            self._get_value(self.ID_PAYLOAD_FORMAT_INDICATOR, '01') +
            self._get_merchant_account_info() +
            self._get_value(self.ID_MERCHANT_CATEGORY_CODE, '0000') +
            self._get_value(self.ID_TRANSACTION_CURRENCY, '986') +
            self._get_value(self.ID_TRANSACTION_AMOUNT, self.valor) +
            self._get_value(self.ID_COUNTRY_CODE, 'BR') +
            self._get_value(self.ID_MERCHANT_NAME, self.nome_recebedor) +
            self._get_value(self.ID_MERCHANT_CITY, self.cidade_recebedor) +
            self._get_additional_data_field() +
            self.ID_CRC16 + '04'
        )

        # Calcular CRC16
        crc16_func = crcmod.predefined.mkCrcFun('crc-16-ccitt-false')
        crc_val = hex(crc16_func(payload.encode('utf-8'))).upper().split('X')[-1].zfill(4)

        return f"{payload}{crc_val}"

def generate_pix_payload(chave_pix, valor, nome_recebedor, cidade_recebedor, txt_id="OS000"):
    try:
        pix = PixPayload(chave_pix, valor, nome_recebedor, cidade_recebedor, txt_id)
        return pix.generate_payload()
    except Exception as e:
        logger.error(f"Erro ao gerar payload PIX: {e}")
        return None
