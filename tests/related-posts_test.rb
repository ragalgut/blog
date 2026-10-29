require 'jekyll'
require_relative '../_plugins/related-posts'

Post = Struct.new(:url, :date, :data)
def post(url, topic, tags, day = 1)
  Post.new(url, Time.utc(2026, 1, day), { 'topic' => topic, 'tags' => tags })
end

def expect(actual, expected, label)
  raise "#{label}: resultado inesperado" unless actual == expected
end

current = post('/actual', 'cloud', %w[Azure Terraform])
broad = post('/mismo-tema', 'cloud', %w[Windows], 20)
overlap = post('/dos-tecnologias', 'automatizacion', %w[Azure Terraform], 2)
exact = post('/tema-y-tecnologias', 'cloud', %w[Azure Terraform])
unrelated = post('/otra-cosa', 'web', %w[Jekyll])
expect(BlogRelatedPosts.rank(current, [current, broad, overlap, unrelated, exact]), [exact, overlap, broad], 'Afinidad y exclusión del artículo actual')
older = post('/antiguo', 'cloud', %w[Azure], 2)
newer = post('/reciente', 'cloud', %w[Azure], 3)
expect(BlogRelatedPosts.rank(current, [older, newer], 1), [newer], 'Desempate por fecha y límite')
expect(BlogRelatedPosts.rank(current, [current, unrelated]), [], 'Sin coincidencias')
puts 'Artículos relacionados: afinidad, fechas, límite y exclusiones correctos.'
