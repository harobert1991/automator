import SMSAPI from 'smsapicom';

const ADMIN_PHONE = '0032479259110';

const smsapi = new SMSAPI({
    oauth: {
        accessToken: "MamliNvPdkVdXNVExGV2o7PzhXVBlqjKNDYC8Vf3",
    },
});

class Log {
    constructor() {
        this.dbObj = {};
    }

    async save() {
        // Pour cet exemple, on log simplement dans la console
        console.log('Saving log:', this.dbObj);
    }
}

const SMSUtils = {
    sendSMS: async (data) => {
        try {
            if (process.env.NODE_ENV === 'development') {
                console.log('SMS qui serait envoyé en production:', data);
                return true;
            }
            console.log("the env", process.env.SMSAPI_ACCESS_TOKEN)
            const res = await smsapi.message
                .sms()
                .from('ESTORL')
                .to(data.phone)
                .message(`${data.text}`)
                .execute();

            if (data.toBeSaved) {
                const logs = new Log();
                logs.dbObj = {
                    success: true,
                    text: data.text,
                    phone: data.phone,
                };
                await logs.save();
            }

            return true;

        } catch (err) {
            console.error('Erreur lors de l\'envoi du SMS:', err);

            if (data.toBeSaved) {
                // Log l'erreur
                const logs = new Log();
                logs.dbObj = {
                    success: false,
                    text: data.text,
                    phone: data.phone,
                };
                await logs.save();

                // Envoyer une notification d'erreur à l'admin
                try {
                    await smsapi.message
                        .sms()
                        .from('ESTORL')
                        .to(ADMIN_PHONE)
                        .message(`Échec d'envoi de SMS au numéro: ${data.phone}`)
                        .execute();
                } catch (adminSmsError) {
                    console.error('Échec de l\'envoi du SMS d'erreur à l\'admin:', adminSmsError);
                }
            }

            return false;
        }
    },
};

export default SMSUtils;