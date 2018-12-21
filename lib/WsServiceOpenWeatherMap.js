// homebridge-ws/lib/WsServiceOpenWeatherMap.js
// Copyright © 2018 Erik Baauw. All rights reserved.
//
// Homebridege plugin for virtual weather station.

'use strict'

const homebridgeLib = require('homebridge-lib')
const moment = require('moment')

function check (value) {
  const v = parseInt(value)
  return isNaN(v) ? 0 : v
}

const windDirections = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'
]
function windDirection (degrees) {
  return windDirections[Math.round(degrees * 16 / 360)]
}

module.exports = class WsServiceOpenWeatherMap extends homebridgeLib.LibService {
  static get Temperature () {
    return class Temperature extends WsServiceOpenWeatherMap {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Temperature'
        params.Service = wsAccessory.Service.eve.TemperatureSensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'temperature',
            Characteristic: this.Characteristic.eve.CurrentTemperature,
            unit: '°C'
          },
          {
            key: 'temperatureUnit',
            Characteristic: this.Characteristic.hap.TemperatureDisplayUnits,
            value: this.Characteristic.hap.TemperatureDisplayUnits.CELSIUS
          }
        ]
      }

      checkObservation (observation) {
        this.values.temperature = check(Math.round(observation.main.temp))
      }
    }
  }

  static get Humidity () {
    return class Humidity extends WsServiceOpenWeatherMap {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Humidity'
        params.Service = wsAccessory.Service.hap.HumiditySensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'humidity',
            Characteristic: this.Characteristic.hap.CurrentRelativeHumidity,
            unit: '%'
          }
        ]
      }

      checkObservation (observation) {
        this.values.humidity = check(observation.main.humidity)
      }
    }
  }

  static get AirPressure () {
    return class AirPressure extends WsServiceOpenWeatherMap {
      constructor (wsAccessory, params = {}) {
        params.name = wsAccessory.name + ' Weather'
        params.Service = wsAccessory.Service.eve.AirPressureSensor
        super(wsAccessory, params)
      }

      get characteristics () {
        return [
          {
            key: 'pressure',
            Characteristic: this.Characteristic.eve.AirPressure
          },
          {
            key: 'elevation',
            Characteristic: this.Characteristic.eve.Elevation,
            value: 0
          },
          {
            key: 'condition',
            Characteristic: this.Characteristic.eve.WeatherCondition
          },
          // {
          //   key: 'rain1h',
          //   Characteristic: this.Characteristic.eve.Rain1h
          // },
          // {
          //   key: 'rain',
          //   Characteristic: this.Characteristic.eve.Rain24h
          // },
          {
            key: 'visibility',
            Characteristic: this.Characteristic.eve.Visibility
          },
          {
            key: 'wind',
            Characteristic: this.Characteristic.eve.WindDirection
          },
          {
            key: 'windSpeed',
            Characteristic: this.Characteristic.eve.WindSpeed
          },
          {
            key: 'lastupdated',
            Characteristic: this.Characteristic.my.LastUpdated
          },
          {
            key: 'heartrate',
            Characteristic: this.Characteristic.my.Heartrate,
            props: { unit: 'min', minValue: 10, maxValue: 120, minStep: 10 },
            value: 10
          }
        ]
      }

      checkObservation (observation) {
        this.values.pressure = check(observation.main.pressure)
        this.values.condition = observation.weather.map((condition) => {
          return condition.main
        }).join(', ')
        this.values.visibility = check(Math.round(observation.visibility / 1000))
        this.values.wind = windDirection(observation.wind.deg)
        this.values.windSpeed = check(Math.round(observation.wind.speed * 3.6))
        this.values.lastupdated = String(new Date(moment.unix(observation.dt)))
          .substr(0, 24)
      }
    }
  }
}
