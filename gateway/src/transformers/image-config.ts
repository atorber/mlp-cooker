import type { ImageConfig } from '../types/unified/index.js';
import type {
  BackendImageConf,
  BackendDevImage,
} from '../types/backend/index.js';
import { IMAGE_TYPE_MAPPING, IMAGE_SOURCE_TO_TYPE } from '../types/unified/image-config.js';

/**
 * 镜像配置转换器
 */
export class ImageConfigTransformer {
  /**
   * 统一结构 -> 训练任务后端结构
   * 训练任务使用字符串形式的镜像地址 + 可选的 imageConfig
   */
  toTrainingJob(image: ImageConfig): {
    image: string;
    imageConfig?: { username: string; password: string };
  } {
    const result: {
      image: string;
      imageConfig?: { username: string; password: string };
    } = {
      image: image.url,
    };

    if (image.auth) {
      result.imageConfig = {
        username: image.auth.username,
        password: image.auth.password,
      };
    }

    return result;
  }

  /**
   * 训练任务后端结构 -> 统一结构
   */
  fromTrainingJob(
    image: string,
    imageConfig?: { username?: string; password?: string }
  ): ImageConfig {
    const result: ImageConfig = {
      url: image,
    };

    if (imageConfig?.username || imageConfig?.password) {
      result.auth = {
        username: imageConfig?.username || '',
        password: imageConfig?.password || '',
      };
    }

    return result;
  }

  /**
   * 统一结构 -> 服务部署后端结构
   */
  toService(image: ImageConfig): BackendImageConf {
    const result: BackendImageConf = {
      imageUrl: image.url,
    };

    if (image.source) {
      result.imageType = IMAGE_SOURCE_TO_TYPE[image.source];
    }

    if (image.auth) {
      result.username = image.auth.username;
      result.password = image.auth.password;
    }

    return result;
  }

  /**
   * 服务部署后端结构 -> 统一结构
   */
  fromService(image: BackendImageConf): ImageConfig {
    const result: ImageConfig = {
      url: image.imageUrl,
    };

    if (image.imageType !== undefined) {
      result.source = IMAGE_TYPE_MAPPING[image.imageType];
    }

    if (image.username || image.password) {
      result.auth = {
        username: image.username || '',
        password: image.password || '',
      };
    }

    return result;
  }

  /**
   * 统一结构 -> 开发机后端结构
   */
  toDevInstance(image: ImageConfig): BackendDevImage {
    const result: BackendDevImage = {
      imageType: image.source ? IMAGE_SOURCE_TO_TYPE[image.source] : 0,
      imageUrl: image.url,
    };

    if (image.auth) {
      result.username = image.auth.username;
      result.password = image.auth.password;
    }

    return result;
  }

  /**
   * 开发机后端结构 -> 统一结构
   */
  fromDevInstance(image: BackendDevImage): ImageConfig {
    const result: ImageConfig = {
      url: image.imageUrl,
    };

    if (image.imageType !== undefined) {
      result.source = IMAGE_TYPE_MAPPING[image.imageType];
    }

    if (image.username || image.password) {
      result.auth = {
        username: image.username || '',
        password: image.password || '',
      };
    }

    return result;
  }
}

export const imageConfigTransformer = new ImageConfigTransformer();
