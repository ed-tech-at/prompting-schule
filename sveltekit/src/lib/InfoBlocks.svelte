<script lang="ts">
  import type { InfoBlockView } from '$lib/infoblocks';

  // Already filtered and ordered by loadInfoBlocks(). The default keeps pages
  // (and their tests) working when no blocks are passed at all.
  export let blocks: InfoBlockView[] = [];

  const variantClass: Record<string, string> = {
    info: '',
    warning: 'variant-warning',
    success: 'variant-success'
  };
</script>

{#if blocks.length > 0}
  <div class="infoblocks">
    {#each blocks as block (block.id)}
      <!-- Styled globally in layout.css: scoped styles do not reach {@html}. -->
      <mark class="infoblock {variantClass[block.variant] ?? ''}">
        {@html block.content}
      </mark>
    {/each}
  </div>
{/if}
