#!/bin/bash
# ============================================================
# pack.sh — Markdown Viewer Enhanced 打包脚本
# 读取 .packignore 配置，排除非运行时文件，生成 zip 发布包
# ============================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 切换到脚本所在目录（项目根目录）
cd "$(dirname "$0")"

# 从 manifest.json 读取版本号
VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | head -1 | grep -o '"[^"]*"$' | tr -d '"')
if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ 无法从 manifest.json 读取版本号${NC}"
    exit 1
fi

# 从 manifest.json 读取扩展名称（使用 default_locale 对应的名称）
EXT_NAME="markdown_viewer_enhanced"

# 输出文件名
OUTPUT_FILE="${EXT_NAME}-v${VERSION}.zip"

echo -e "${CYAN}📦 Markdown Viewer Enhanced 打包工具${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   版本: ${GREEN}v${VERSION}${NC}"
echo -e "   输出: ${GREEN}${OUTPUT_FILE}${NC}"
echo ""

# 检查 .packignore 是否存在
PACKIGNORE=".packignore"
if [ ! -f "$PACKIGNORE" ]; then
    echo -e "${RED}❌ 未找到 ${PACKIGNORE} 配置文件${NC}"
    exit 1
fi

# 如果已存在同名 zip，先删除
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}⚠️  删除已存在的 ${OUTPUT_FILE}${NC}"
    rm -f "$OUTPUT_FILE"
fi

# 解析 .packignore，生成 zip 排除参数
# 规则：忽略空行和 # 开头的注释行
EXCLUDE_ARGS=()
while IFS= read -r line || [ -n "$line" ]; do
    # 跳过空行和注释
    line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ -z "$line" ] || [[ "$line" == \#* ]]; then
        continue
    fi
    # 目录模式（以 / 结尾）→ 排除目录及其内容
    if [[ "$line" == */ ]]; then
        dir="${line%/}"
        EXCLUDE_ARGS+=("-x" "${dir}/*")
    # 通配符模式（包含 *）→ 直接使用
    elif [[ "$line" == *\** ]]; then
        EXCLUDE_ARGS+=("-x" "$line")
    # 具体文件路径
    else
        EXCLUDE_ARGS+=("-x" "$line")
    fi
done < "$PACKIGNORE"

echo -e "${CYAN}🔍 排除规则（来自 .packignore）:${NC}"
# 显示排除的条目（去重显示）
while IFS= read -r line || [ -n "$line" ]; do
    line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ -z "$line" ] || [[ "$line" == \#* ]]; then
        continue
    fi
    echo -e "   ${YELLOW}✗${NC} $line"
done < "$PACKIGNORE"
echo ""

# 执行打包
echo -e "${CYAN}📁 正在打包...${NC}"
zip -r "$OUTPUT_FILE" . "${EXCLUDE_ARGS[@]}" -x ".*" > /dev/null 2>&1

# 注意：-x ".*" 会排除所有隐藏文件/目录（.git, .gitignore 等）
# .packignore 中的 .git/ .gitignore 规则作为显式声明保留

# 验证打包结果
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    FILE_COUNT=$(zipinfo -t "$OUTPUT_FILE" 2>/dev/null | grep -o '[0-9]* files' | grep -o '[0-9]*' || echo "?")

    echo ""
    echo -e "${GREEN}✅ 打包完成！${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   文件: ${GREEN}${OUTPUT_FILE}${NC}"
    echo -e "   大小: ${GREEN}${FILE_SIZE}${NC}"
    echo -e "   包含: ${GREEN}${FILE_COUNT} 个文件${NC}"
    echo ""

    # 列出包内文件结构（仅顶层目录）
    echo -e "${CYAN}📋 包内顶层结构:${NC}"
    zipinfo -1 "$OUTPUT_FILE" | sed 's|/.*|/|' | sort -u | while read -r entry; do
        if [[ "$entry" == */ ]]; then
            echo -e "   📂 $entry"
        else
            echo -e "   📄 $entry"
        fi
    done
else
    echo -e "${RED}❌ 打包失败！${NC}"
    exit 1
fi
