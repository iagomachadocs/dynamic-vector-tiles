
const validFormats = new Set(['mvt', 'pbf'])

export function tileIsValid(req, res, next) {
  let { x, y, z, format } = req.params 
  
  if(!validFormats.has(format)) {
    return res.status(400).send({ message: 'Invalid format' })
  }

  x = parseInt(x)
  y = parseInt(y)
  z = parseInt(z)

  const size = 2 ** z
  if(x >= size || y >= size || x < 0 || y < 0) {
    return res.status(400).send({ message: 'Invalid coordinates' })
  }

  req.tile = {
    x,
    y,
    zoom: z,
    format
  }

  return next()

}