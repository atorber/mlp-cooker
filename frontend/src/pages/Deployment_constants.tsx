
export const UNIFIED_TASK_PARAMS = `{
    "name": "service-demo",
    "replicas": 1,
    "container": {
        "image": "registry.baidubce.com/inference/vllm-openai:v0.8.3",
        "command": [
            "/bin/sh",
            "-c",
            "sleep inf"
        ],
        "resources": {
            "cpus": 1,
            "memory": 2,
            "gpu": {
                "count": 0
            }
        },
        "envs": [],
        "volumes": []
    },
    "ports": [
        {
            "port": 8080,
            "name": "http"
        }
    ],
    "logConfig": {
        "persistent": false
    },
    "labels": {
        "scheduling.volcano.sh/group-min-member": "1"
    },
    "annotations": {
        "prometheus.io/scrape": "false"
    }
}`;

export const NATIVE_TASK_PARAMS = `{
    "log": {
        "persistent": false
    },
    "instanceCount": 1,
    "misc": {
        "podAnnotations": {
            "prometheus.io/scrape": "false"
        },
        "podLabels": {
            "scheduling.volcano.sh/group-min-member": "1"
        },
        "gracePeriodSec": 30,
        "fedPodsPerIns": 0
    },
    "resourcePool": {
        "resourcePoolId": "cce-7t7mqjci",
        "resourcePoolName": "aihc-pom",
        "queueName": "default",
        "resourcePoolType": ""
    },
    "deploy": {
        "schedule": {
            "priority": "high"
        },
        "canaryStrategy": {
            "maxSurge": 25,
            "maxUnavailable": 25
        }
    },
    "name": "openapi-test-3",
    "acceleratorType": "",
    "workloadType": "",
    "containers": [
        {
            "name": "custom-container",
            "cpus": 1,
            "memory": 2,
            "acceleratorCount": 0,
            "command": [
                "/bin/sh",
                "-c",
                "sleep inf"
            ],
            "ports": [
                {
                    "name": "HTTP",
                    "port": 10088
                }
            ],
            "envs": {},
            "image": {
                "imageType": 0,
                "imageUrl": "registry.baidubce.com/inference/vllm-openai:v0.8.3"
            },
            "volumeMounts": [],
            "startupsProbe": null,
            "readinessProbe": null,
            "livenessProbe": null
        }
    ],
    "access": {
        "publicAccess": false,
        "networkType": "aiGateway",
        "aiGateway": {
            "enableAuth": true
        }
    }
}`;
