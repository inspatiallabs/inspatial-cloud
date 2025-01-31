## Memory Tuning

Postgres is a memory hog. It will use as much memory as you give it. The more
memory you give it, the faster it will run. The less memory you give it, the
slower it will run. The default configuration is set to use a very small amount
of memory. This is because Postgres is designed to run on a wide variety of
hardware configurations. It is up to you to tune Postgres to use the amount of
memory that is appropriate for your hardware.

### Shared Buffers

`shared_buffers` is the amount of memory that Postgres will use for caching
data. The default value is 128MB. This is a very small amount of memory. You
should set this to at least 25% of your total system memory. If you have 4GB of
memory, you should set this to 1GB. If you have 8GB of memory, you should set
this to 2GB etc.

The default value for this parameter, which is set in postgresql.conf, is:

```conf
#shared_buffers = 128MB
```

### Work Memory

`work_mem` is the amount of memory that Postgres will use for sorting and
hashing operations. The default value is 4MB.

```
Total RAM * 0.25 / max_connections
```

so if you have 4GB of memory and 100 connections, you should set this to 10MB.

### Maintenance Work Memory

The maintenance_work_mem parameter basically provides the maximum amount of
memory to be used by maintenance operations like vacuum, create index, and alter
table add foreign key operations.

The default value for this parameter, which is set in postgresql.conf, is:

```conf
#maintenance_work_mem = 64MB
```

It’s recommended to set this value higher than work_mem; this can improve
performance for vacuuming. In general it should be:

```
Total RAM * 0.05
```

### Effective Cache Size

`effective_cache_size` is the amount of memory that Postgres will use for
caching data that is stored on disk. The default value is 128MB. You should set
this to at least 50% of your total system memory. If you have 4GB of memory, you
should set this to 2GB. If you have 8GB of memory, you should set this to 4GB
etc.
