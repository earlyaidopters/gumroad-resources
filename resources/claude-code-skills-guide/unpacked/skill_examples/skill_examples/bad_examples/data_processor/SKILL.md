---
name: data_processor
description: Implements a sophisticated multi-paradigm data transformation pipeline with configurable ETL stages, supporting both batch and streaming modalities across heterogeneous data sources with automatic schema inference and adaptive type coercion mechanisms.
metadata:
  author: DataTeam
  version: 0.0.1-alpha-rc2
  category: data-engineering
  tags: [etl, pipeline, transformation, batch, streaming, schema, coercion, inference, heterogeneous, multi-paradigm, configurable, adaptive]
  internal-build-id: 7f3a2b1c
  jira-ticket: DATA-4521
  sprint: 2026-Q1-S3
  code-review: pending
  test-coverage: 43%
---

# Universal Data Processing Engine v0.0.1-alpha

## Abstract

This skill provides a comprehensive, enterprise-grade data processing framework that leverages Claude's analytical capabilities to perform complex ETL (Extract, Transform, Load) operations across multiple data formats and storage backends. The system implements a plugin-based architecture with hot-swappable transformation stages, supporting both synchronous and asynchronous processing modes with configurable parallelism levels and automatic resource management.

## Architecture Overview

The processing pipeline consists of the following abstract layers:

### Layer 1: Ingestion Abstraction

The ingestion layer provides a unified interface for data source connectivity. Supported sources include but are not limited to relational databases, document stores, flat files, API endpoints, message queues, and streaming platforms. Each source connector implements the `IDataSource` interface which provides:

- `connect()`: Establishes connection with automatic retry logic
- `read(batch_size)`: Reads data in configurable batch sizes
- `schema()`: Returns inferred schema with confidence scores
- `close()`: Graceful connection termination with resource cleanup

### Layer 2: Transformation Pipeline

Transformations are applied as a directed acyclic graph (DAG) of operations. Each transformation node implements the `ITransformer` interface:

- `validate(input_schema)`: Validates input compatibility
- `transform(data_frame)`: Applies transformation logic
- `output_schema()`: Declares output schema for downstream consumers

### Layer 3: Output Materialization

The materialization layer handles the final stage of data persistence. Output adapters support multiple formats and destinations with configurable write semantics (at-least-once, exactly-once, best-effort).

## Configuration

Processing behavior is controlled through a YAML configuration file that specifies source connections, transformation DAGs, output targets, monitoring hooks, and alerting thresholds. The configuration supports variable interpolation, environment-specific overrides, and encrypted credential references.

## Supported Formats

CSV, TSV, JSON, JSONL, Parquet, Avro, ORC, Protocol Buffers, MessagePack, CBOR, BSON, XML, YAML, TOML, INI, HDF5, NetCDF, Feather, Arrow IPC, Excel (XLS, XLSX, XLSM, XLSB), Google Sheets, Numbers, OpenDocument Spreadsheet, dBase, Fixed-width, COBOL copybook, EBCDIC, and custom binary formats with user-defined parsers.

## Error Handling

Errors are handled.

## Usage

Process your data with this skill.
