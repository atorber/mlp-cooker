
export const UNIFIED_JOB_PARAMS = `{
    "name": "api-0513-2",
    "queueName": "default",
    "replicas": 1,
    "container": {
        "image": "registry.baidubce.com/aihc-aiak/aiak-megatron:ubuntu20.04-cu11.8-torch1.14.0-py38_v1.2.7.12_release",
        "command": [
            "/bin/sh",
            "-c",
            "sleep 1d"
        ],
        "resources": {
            "cpus": 4,
            "memory": 8,
            "gpu": {
                "count": 0
            }
        },
        "envs": [
            {
                "name": "NCCL_DEBUG",
                "value": "DEBUG"
            },
            {
                "name": "NCCL_IB_DISABLE",
                "value": "0"
            }
        ],
        "volumes": [
            {
                "type": "PFS",
                "name": "pfs-pxE6jz",
                "mountPath": "/mnt/cluster",
                "sourcePath": "/",
                "readOnly": false
            }
        ]
    },
    "priority": "normal",
    "maxRetries": 0
}`;

export const NATIVE_JOB_PARAMS = `{
    "name": "api-0513-2",
    "queue": "default",
    "jobType": "PyTorchJob", 
    "command": "sleep 1d", 
    "jobSpec": {
        "replicas": 1,
        "image": "registry.baidubce.com/aihc-aiak/aiak-megatron:ubuntu20.04-cu11.8-torch1.14.0-py38_v1.2.7.12_release",
        "resources": [
        ],
        "envs": [
            {
                "name": "NCCL_DEBUG",
                "value": "DEBUG"
            },
            {
                "name": "NCCL_IB_DISABLE",
                "value": "0"
            }
        ],
        "enableRDMA": true
    },
    "labels": [
    ],
    "datasources": [
        {
            "type": "pfs",
            "name": "pfs-pxE6jz",
            "mountPath": "/mnt/cluster",
            "sourcePath": "/"
        }
    ]
}`;
