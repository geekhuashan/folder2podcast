import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

/**
 * 临时文件管理器
 *
 * 职责：
 * - 创建和管理临时下载目录
 * - 移动文件到目标目录
 * - 清理过期临时文件
 */
export class TempFileManager {
    private readonly tempRoot: string;  // 临时目录根路径

    constructor(audioDir: string) {
        this.tempRoot = path.join(audioDir, '.temp');
    }

    /**
     * 初始化临时目录
     * 创建临时目录并添加 .gitignore
     */
    async initialize(): Promise<void> {
        await fs.ensureDir(this.tempRoot);

        // 创建 .gitignore，忽略所有临时文件
        const gitignorePath = path.join(this.tempRoot, '.gitignore');
        const gitignoreContent = '*\n!.gitignore\n';

        if (!await fs.pathExists(gitignorePath)) {
            await fs.writeFile(gitignorePath, gitignoreContent);
        }

        console.log(`临时文件管理器已初始化: ${this.tempRoot}`);
    }

    /**
     * 创建任务临时目录
     * @returns 任务ID和临时目录路径
     */
    async createTaskTempDir(): Promise<{ taskId: string; tempDir: string }> {
        const taskId = uuidv4();
        const tempDir = path.join(this.tempRoot, taskId);

        await fs.ensureDir(tempDir);

        console.log(`已创建任务临时目录: ${taskId}`);

        return { taskId, tempDir };
    }

    /**
     * 移动文件到目标目录
     * @param sourceFiles - 源文件路径列表
     * @param targetDir - 目标目录
     * @returns 移动后的文件路径列表
     */
    async moveFilesToTarget(
        sourceFiles: string[],
        targetDir: string
    ): Promise<string[]> {
        // 确保目标目录存在
        await fs.ensureDir(targetDir);

        const movedFiles: string[] = [];

        for (const sourceFile of sourceFiles) {
            const fileName = path.basename(sourceFile);
            const targetFile = path.join(targetDir, fileName);

            // 检查目标文件是否已存在
            if (await fs.pathExists(targetFile)) {
                console.warn(`目标文件已存在，将覆盖: ${fileName}`);
            }

            // 移动文件（重命名）
            await fs.move(sourceFile, targetFile, { overwrite: true });
            movedFiles.push(targetFile);

            console.log(`已移动文件: ${fileName} -> ${targetDir}`);
        }

        return movedFiles;
    }

    /**
     * 清理任务临时目录
     * @param taskId - 任务ID
     */
    async cleanupTaskTempDir(taskId: string): Promise<void> {
        const tempDir = path.join(this.tempRoot, taskId);

        try {
            await fs.remove(tempDir);
            console.log(`已清理任务临时目录: ${taskId}`);
        } catch (error) {
            console.warn(`清理临时目录失败: ${tempDir}`, error);
        }
    }

    /**
     * 清理过期临时文件（超过24小时）
     * 用于定期清理失败任务遗留的临时文件
     */
    async cleanupExpiredTempDirs(): Promise<void> {
        const now = Date.now();
        const expiryMs = 24 * 60 * 60 * 1000; // 24小时

        try {
            const entries = await fs.readdir(this.tempRoot, { withFileTypes: true });

            for (const entry of entries) {
                // 跳过非目录和 .gitignore
                if (!entry.isDirectory() || entry.name.startsWith('.')) {
                    continue;
                }

                const dirPath = path.join(this.tempRoot, entry.name);

                try {
                    const stat = await fs.stat(dirPath);

                    // 检查目录是否过期
                    if (now - stat.mtimeMs > expiryMs) {
                        await fs.remove(dirPath);
                        console.log(`已清理过期临时目录: ${entry.name}`);
                    }
                } catch (error) {
                    console.warn(`检查目录失败: ${entry.name}`, error);
                }
            }
        } catch (error) {
            console.error('清理过期临时目录失败:', error);
        }
    }

    /**
     * 获取临时目录根路径（用于测试）
     */
    getTempRoot(): string {
        return this.tempRoot;
    }
}
