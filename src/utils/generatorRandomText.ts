export const generatorRandomText = (num: number) => {
    const characters = "ABCDEFHKIHLMNOPQRSTUVWXYZAabcdefghiklmnopqrstuvwxyz1234567890"
    let text: string = ""
    for(let i = 0; i < characters.length ; i++) {
        if(text.length < (num ? num : 10)){
            const str = characters[Math.floor(Math.random() * characters.length)]
            text += str
        }
    }
    return text.toLocaleUpperCase()
}