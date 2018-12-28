// homebridge-ws/lib/WsAccessoryWunderground.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const WsService = require('./WsServiceWunderground')

module.exports = class WsAccessoryWunderground extends homebridgeLib.AccessoryDelegate {
  constructor (platform, context) {
    const params = {
      name: context.location,
      id: 'WS-WG-' + context.location.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      manufacturer: 'homebridge-ws',
      model: 'Wunderground',
      firmware: '1.0',
      category: platform.Accessory.hap.Categories.Sensor
    }
    super(platform, params)

    this.context.location = context.location
    this.on('heartbeat', this.heartbeat.bind(this))

    this.resource = '/' + context.location + '.json'
    this.wsServices = {
      temperature: new WsService.Temperature(this),
      humidity: new WsService.Humidity(this),
      pressure: new WsService.AirPressure(this)
    }
    this.wsServices.history = new homebridgeLib.ServiceDelegate.History.Weather(
      this, params,
      this.wsServices.temperature.characteristicDelegate('temperature'),
      this.wsServices.humidity.characteristicDelegate('humidity'),
      this.wsServices.pressure.characteristicDelegate('pressure')
    )
  }

  heartbeat (beat) {
    const heartrate = this.wsServices.pressure.values.heartrate * 60
    if (beat % heartrate === 1) {
      this.platform.wunderground.get(this.resource).then((response) => {
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
      }).catch((err) => {
        this.error(err)
      })
    }
  }
}
