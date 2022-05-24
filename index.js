import 'dotenv/config' 
import express from 'express'
import { VectorTilesController } from './controller.js'
import { tileIsValid } from './middlewares.js'

const app = express()

const controller = new VectorTilesController()

app.get('/:z/:x/:y.:format', tileIsValid, controller.handle)

app.listen(8080, () => {
  console.log('Server listening on port 8080')
})