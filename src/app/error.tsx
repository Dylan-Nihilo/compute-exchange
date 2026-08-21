"use client";

import {Button, Card, Spinner} from "@heroui/react";
import {useTransition} from "react";

type ErrorPageProps = {
  error: Error & {digest?: string};
  reset: () => void;
};

export default function ErrorPage({reset}: ErrorPageProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <Card className="w-full max-w-md" role="alert">
        <Card.Header>
          <Card.Title>服务暂时无法加载</Card.Title>
          <Card.Description>请稍后重试，未完成的操作不会被提交。</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button
            isPending={isPending}
            onPress={() => startTransition(reset)}
          >
            {isPending ? (
              <>
                <Spinner aria-hidden="true" color="current" size="sm" />
                正在重试
              </>
            ) : (
              "重新尝试"
            )}
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
