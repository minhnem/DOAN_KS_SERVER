import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "namtdvp10a6@gmail.com",
      pass: "styyqbcmcrvrnowq",
    },
});

export const handleSendEmail = async (data: {
    from: string,
    to: string,
    subject: string,
    text: string,
    html: string,
}) => {
    try {
        const info = await transporter.sendMail(data);
        return info
    } catch (error: any) {
        throw new Error(error.message)
    }
}

 