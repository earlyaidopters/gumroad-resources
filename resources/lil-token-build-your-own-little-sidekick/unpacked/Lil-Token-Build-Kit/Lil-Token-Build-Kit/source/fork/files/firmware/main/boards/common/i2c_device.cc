#include "i2c_device.h"

#include <esp_log.h>
#include <esp_timer.h>
#include <cstring>

#define TAG "I2cDevice"


I2cDevice::I2cDevice(i2c_master_bus_handle_t i2c_bus, uint8_t addr) {
    i2c_device_config_t i2c_device_cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = addr,
        .scl_speed_hz = 400 * 1000,
        .scl_wait_us = 0,
        .flags = {
            .disable_ack_check = 0,
        },
    };
    ESP_ERROR_CHECK(i2c_master_bus_add_device(i2c_bus, &i2c_device_cfg, &i2c_device_));
    assert(i2c_device_ != NULL);
}

// Lil Token: these used ESP_ERROR_CHECK, so one I2C timeout on the shared
// internal bus (busy during dances) aborted and rebooted the robot. Log
// (rate limited) and carry on instead; a failed read returns zeros.
static void LogI2cError(const char* op, uint8_t reg, esp_err_t err) {
    static int64_t last_log_us = 0;
    int64_t now = esp_timer_get_time();
    if (now - last_log_us > 5 * 1000 * 1000) {
        ESP_LOGW(TAG, "%s reg 0x%02X failed: 0x%X (ignored)", op, reg, err);
        last_log_us = now;
    }
}

void I2cDevice::WriteReg(uint8_t reg, uint8_t value) {
    uint8_t buffer[2] = {reg, value};
    esp_err_t err = i2c_master_transmit(i2c_device_, buffer, 2, 100);
    if (err != ESP_OK) LogI2cError("write", reg, err);
}

uint8_t I2cDevice::ReadReg(uint8_t reg) {
    uint8_t buffer[1] = {0};
    esp_err_t err = i2c_master_transmit_receive(i2c_device_, &reg, 1, buffer, 1, 100);
    if (err != ESP_OK) {
        LogI2cError("read", reg, err);
        return 0;
    }
    return buffer[0];
}

void I2cDevice::ReadRegs(uint8_t reg, uint8_t* buffer, size_t length) {
    esp_err_t err = i2c_master_transmit_receive(i2c_device_, &reg, 1, buffer, length, 100);
    if (err != ESP_OK) {
        LogI2cError("read", reg, err);
        memset(buffer, 0, length);
    }
}
