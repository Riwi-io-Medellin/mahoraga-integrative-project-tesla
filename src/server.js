import app from './app.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.APP_PORT || 3000

app.listen(PORT, (errorServer) => {
    if(errorServer) {
        console.log(errorServer)
        process.exit(-1)
    }
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`)   
        
});