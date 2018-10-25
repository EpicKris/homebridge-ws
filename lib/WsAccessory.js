// homebridge-ws/lib/WsAccessory.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const WsService = require('./WsService')

function check (value) {
  const v = parseInt(value)
  return isNaN(v) ? 0 : v
}

module.exports = class WsAccessory extends homebridgeLib.LibAccessory {
  constructor (platform, context) {
    const params = {
      name: context.location,
      id: 'WS-' + context.location.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      manufacturer: 'homebridge-ws',
      model: 'Wunderground',
      firmware: '1.0',
      category: platform.Accessory.hap.Categories.Sensor
    }
    super(platform, params)

    this.context.location = context.location
    this.on('heartbeat', this.heartbeat)

    this.location = context.location + '.json'
    this.wsServices = {
      temperature: new WsService.Temperature(this),
      humidity: new WsService.Humidity(this),
      pressure: new WsService.AirPressure(this),
      history: new homebridgeLib.LibService.History.Weather(this, params)
    }
  }

  heartbeat (beat) {
    const heartrate = this.wsServices.pressure.values.heartrate * 60
    if (beat % heartrate === 0) {
      this.platform.wunderground.get(this.location).then((response) => {
        if (!response.current_observation) {
          if (
            response.response && response.response.error &&
            response.response.error.description
          ) {
            this.error(
              'Wunderground error: %s', response.response.error.description
            )
            return
          }
          this.error('Wunderground error: %j', response)
          return
        }
        // this.debug('%j', response)
        const observation = response.current_observation
        this.wsServices.temperature.checkObservation(observation)
        this.wsServices.humidity.checkObservation(observation)
        this.wsServices.pressure.checkObservation(observation)
        this.wsServices.history.temperature = check(observation.temp_c)
        this.wsServices.history.humidity = check(observation.relative_humidity)
        this.wsServices.history.pressure = check(observation.pressure_mb)
      }).catch((err) => {
        this.error(err)
      })
    }
  }
}
