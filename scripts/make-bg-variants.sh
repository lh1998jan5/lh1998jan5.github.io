#!/usr/bin/env bash
# =========================================================
# 生成背景图的响应式尺寸版本（原图不动）
# ---------------------------------------------------------
# 用法：
#   bash scripts/make-bg-variants.sh
#
# 作用：
#   把 backgrounds/ 下的 JPEG 原图，按长边缩放成 1280 / 2560 两种尺寸，
#   分别放进 backgrounds/1280/ 和 backgrounds/2560/，文件名保持一致。
#   页面会根据「屏幕宽度 × 像素比」自动挑选合适的一档；
#   某一档缺失时自动退回下一档，最后退回原图。
#
# 说明：
#   - 只缩小、不放大：原图比目标档还小时只做转码，避免越缩越糊。
#   - PNG 不处理（转 JPEG 会变文件名），页面会直接用 PNG 原图。
#   - 兼容 macOS 自带的 bash 3.2。
#
# 依赖：
#   macOS 自带 sips；其它系统用 ImageMagick（magick / convert）。
# =========================================================
set -euo pipefail

cd "$(dirname "$0")/.."

SIZES=(1280 2560)
QUALITY_JPEG=80

# 选择缩放工具
if command -v sips >/dev/null 2>&1; then
  TOOL=sips
elif command -v magick >/dev/null 2>&1; then
  TOOL=magick
elif command -v convert >/dev/null 2>&1; then
  TOOL=convert
else
  echo "找不到 sips / magick / convert，无法生成变体。" >&2
  exit 1
fi

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# 取图片长边（像素）
long_side() {
  if [ "$TOOL" = sips ]; then
    sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null \
      | awk '/pixelWidth/{w=$2}/pixelHeight/{h=$2}END{print (w>h?w:h)}'
  elif [ "$TOOL" = magick ]; then
    magick identify -format '%[fx:max(w,h)]' "$1" 2>/dev/null || echo 0
  else
    identify -format '%[fx:max(w,h)]' "$1" 2>/dev/null || echo 0
  fi
}

shopt -s nullglob nocaseglob

SRC=()
PNG=()
for f in backgrounds/*.jpg backgrounds/*.jpeg backgrounds/*.png; do
  [ -f "$f" ] || continue
  case "$(lower "$f")" in
    *.png) PNG+=("$f") ;;
    *)     SRC+=("$f") ;;
  esac
done

if [ ${#SRC[@]} -eq 0 ]; then
  if [ ${#PNG[@]} -gt 0 ]; then
    echo "只有 PNG，没有 JPEG；PNG 不生成变体（页面会直接用原图）。" >&2
    exit 0
  fi
  echo "backgrounds/ 下没有找到图片。" >&2
  exit 1
fi

echo "工具：${TOOL}，共 ${#SRC[@]} 张 JPEG 原图"
if [ ${#PNG[@]} -gt 0 ]; then
  echo "跳过 ${#PNG[@]} 张 PNG（页面会用原图，建议先转成 JPEG）"
fi

for size in "${SIZES[@]}"; do
  outdir="backgrounds/$size"
  mkdir -p "$outdir"

  for f in "${SRC[@]}"; do
    name="$(basename "$f")"
    out="$outdir/$name"

    if [ "$TOOL" = sips ]; then
      src_long="$(long_side "$f")"
      case "$src_long" in ''|*[!0-9]*) src_long=0 ;; esac

      if [ "$src_long" -gt "$size" ]; then
        # -Z：按长边等比缩放，短边自动跟随，不裁切、不拉伸
        sips -s format jpeg -s formatOptions "$QUALITY_JPEG" -Z "$size" "$f" --out "$out" >/dev/null
      else
        # 原图本来就比目标档小：只转码，不放大
        sips -s format jpeg -s formatOptions "$QUALITY_JPEG" "$f" --out "$out" >/dev/null
      fi
    else
      # 长边不超过 size，> 表示只缩小不放大；-auto-orient 处理手机照片方向
      "$TOOL" "$f" -auto-orient -resize "${size}x${size}>" -strip -quality "$QUALITY_JPEG" "$out"
    fi
  done

  echo "已生成 $outdir/"
done

echo "完成。原图未改动。"
